const Cart = require('../models/Cart');
const Product = require('../models/Product');
const MysteryBox = require('../models/MysteryBox');
const Coupon = require('../models/Coupon');

exports.getCart = async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id })
    .populate('items.product', 'name images price stock slug isActive')
    .populate('items.mysteryBox', 'name image price stock tier isActive');

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= 500 ? 0 : 50;
  let discount = 0;

  if (cart.coupon) {
    const coupon = await Coupon.findById(cart.coupon);
    if (coupon) discount = coupon.calculateDiscount(subtotal);
  }

  res.json({
    success: true,
    cart,
    summary: {
      subtotal,
      shipping,
      discount,
      total: subtotal + shipping - discount,
    },
  });
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
      (itemType === 'product'
        ? i.product?.toString() === itemId
        : i.mysteryBox?.toString() === itemId)
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
  res.json({ success: true, message: 'Added to cart', cartCount: cart.items.length });
};

exports.updateCartItem = async (req, res) => {
  const { quantity } = req.body;
  if (quantity < 1) return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

  const item = cart.items.id(req.params.itemId);
  if (!item) return res.status(404).json({ success: false, message: 'Item not found in cart' });

  if (item.itemType === 'product') {
    const product = await Product.findById(item.product);
    if (product && product.stock < quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }
  }

  item.quantity = quantity;
  await cart.save();
  res.json({ success: true, message: 'Cart updated' });
};

exports.removeCartItem = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
  cart.items = cart.items.filter((item) => item._id.toString() !== req.params.itemId);
  await cart.save();
  res.json({ success: true, message: 'Item removed from cart' });
};

exports.clearCart = async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [], coupon: null, couponCode: null });
  res.json({ success: true, message: 'Cart cleared' });
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

  res.json({ success: true, message: 'Coupon applied', discount, couponCode: cart.couponCode });
};

exports.removeCoupon = async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { coupon: null, couponCode: null });
  res.json({ success: true, message: 'Coupon removed' });
};
