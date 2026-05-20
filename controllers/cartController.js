const Cart = require('../models/Cart');
const Product = require('../models/Product');
const MysteryBox = require('../models/MysteryBox');
const Coupon = require('../models/Coupon');

const FREE_SHIPPING_THRESHOLD = 500;
const SHIPPING_FLAT = 50;

/** Single populated read + summary (used by GET and all mutating handlers). */
async function cartPayloadForUser(userId) {
  let cart = await Cart.findOne({ user: userId })
    .populate('items.product', 'name images price stock slug isActive isTestProduct')
    .populate('items.mysteryBox', 'name image price stock tier isActive')
    .lean();

  if (!cart) {
    await Cart.create({ user: userId, items: [] });
    cart = await Cart.findOne({ user: userId })
      .populate('items.product', 'name images price stock slug isActive')
      .populate('items.mysteryBox', 'name image price stock tier isActive')
      .lean();
  }

  for (const it of cart.items) {
    if (it.product && Array.isArray(it.product.images) && it.product.images.length > 1) {
      it.product = { ...it.product, images: [it.product.images[0]] };
    }
  }

  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const hasOnlyTestProducts = cart.items.length > 0 && cart.items.every((it) => it.product?.isTestProduct);
  const shipping = hasOnlyTestProducts || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  let discount = 0;

  if (cart.coupon) {
    const coupon = await Coupon.findById(cart.coupon);
    if (coupon) discount = coupon.calculateDiscount(subtotal);
  }

  const summary = {
    subtotal,
    shipping,
    discount,
    total: subtotal + shipping - discount,
  };

  return { cart, summary };
}

function cartLineCount(cart) {
  if (!cart?.items?.length) return 0;
  return cart.items.reduce((sum, i) => sum + (i.quantity || 0), 0);
}

exports.getCart = async (req, res) => {
  const { cart, summary } = await cartPayloadForUser(req.user._id);
  res.json({ success: true, cart, summary });
};

exports.addToCart = async (req, res) => {
  const { itemId, itemType, quantity = 1 } = req.body;

  let item;
  let price;
  let name;
  let image;

  if (itemType === 'product') {
    item = await Product.findById(itemId);
    if (!item || !item.isActive) return res.status(404).json({ success: false, message: 'Product not found' });
    if (item.stock < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });
    price = item.discountPrice || item.price;
    name = item.name;
    image = item.images[0]?.url || '';
  } else if (itemType === 'mysteryBox') {
    item = await MysteryBox.findById(itemId);
    if (!item || !item.isActive) return res.status(404).json({ success: false, message: 'Mystery box not found' });
    if (item.stock < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });
    price = item.price;
    name = item.name;
    image = item.image;
  } else {
    return res.status(400).json({ success: false, message: 'Invalid item type' });
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = new Cart({ user: req.user._id, items: [] });

  const existingIndex = cart.items.findIndex(
    (i) =>
      i.itemType === itemType &&
      (itemType === 'product' ? i.product?.toString() === itemId : i.mysteryBox?.toString() === itemId)
  );

  if (existingIndex > -1) {
    cart.items[existingIndex].quantity += quantity;
  } else {
    const newItem = { itemType, quantity, price, name, image };
    if (itemType === 'product') newItem.product = itemId;
    else newItem.mysteryBox = itemId;
    cart.items.push(newItem);
  }

  await cart.save();

  const payload = await cartPayloadForUser(req.user._id);
  res.json({
    success: true,
    message: 'Added to cart',
    cart: payload.cart,
    summary: payload.summary,
    cartCount: cartLineCount(payload.cart),
  });
};

exports.updateCartItem = async (req, res) => {
  const { quantity } = req.body;
  if (quantity < 1) return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

  const line = cart.items.id(req.params.itemId);
  if (!line) return res.status(404).json({ success: false, message: 'Item not found in cart' });

  if (line.itemType === 'product') {
    const product = await Product.findById(line.product);
    if (product && product.stock < quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }
  }

  line.quantity = quantity;
  await cart.save();

  const payload = await cartPayloadForUser(req.user._id);
  res.json({
    success: true,
    message: 'Cart updated',
    cart: payload.cart,
    summary: payload.summary,
    cartCount: cartLineCount(payload.cart),
  });
};

exports.removeCartItem = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
  cart.items = cart.items.filter((item) => item._id.toString() !== req.params.itemId);
  await cart.save();

  const payload = await cartPayloadForUser(req.user._id);
  res.json({
    success: true,
    message: 'Item removed from cart',
    cart: payload.cart,
    summary: payload.summary,
    cartCount: cartLineCount(payload.cart),
  });
};

exports.clearCart = async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [], coupon: null, couponCode: null });
  const payload = await cartPayloadForUser(req.user._id);
  res.json({
    success: true,
    message: 'Cart cleared',
    cart: payload.cart,
    summary: payload.summary,
    cartCount: 0,
  });
};

exports.applyCoupon = async (req, res) => {
  const { code } = req.body;
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });

  if (!coupon) return res.status(404).json({ success: false, message: 'Invalid coupon code' });

  const validity = coupon.isValid();
  if (!validity.valid) return res.status(400).json({ success: false, message: validity.message });

  const alreadyUsed = coupon.usedBy.some((id) => id.toString() === req.user._id.toString());
  if (alreadyUsed) return res.status(400).json({ success: false, message: 'You have already used this coupon' });

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (subtotal < coupon.minOrderValue) {
    return res.status(400).json({
      success: false,
      message: `Minimum order value ₹${coupon.minOrderValue} required`,
    });
  }

  const discount = coupon.calculateDiscount(subtotal);
  cart.coupon = coupon._id;
  cart.couponCode = code.toUpperCase();
  await cart.save();

  const payload = await cartPayloadForUser(req.user._id);
  res.json({
    success: true,
    message: 'Coupon applied',
    discount,
    couponCode: payload.cart.couponCode,
    cart: payload.cart,
    summary: payload.summary,
    cartCount: cartLineCount(payload.cart),
  });
};

exports.removeCoupon = async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { coupon: null, couponCode: null });
  const payload = await cartPayloadForUser(req.user._id);
  res.json({
    success: true,
    message: 'Coupon removed',
    cart: payload.cart,
    summary: payload.summary,
    cartCount: cartLineCount(payload.cart),
  });
};
