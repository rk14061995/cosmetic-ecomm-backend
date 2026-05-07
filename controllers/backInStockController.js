const BackInStockAlert = require('../models/BackInStockAlert');
const Product = require('../models/Product');
const { sendEmail } = require('../services/emailService');

exports.subscribe = async (req, res) => {
  const { productId } = req.params;
  const email = req.body.email || req.user?.email;
  if (!email) return res.status(400).json({ success: false, message: 'Email required' });

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  if (product.stock > 0) return res.status(400).json({ success: false, message: 'Product is already in stock' });

  await BackInStockAlert.findOneAndUpdate(
    { product: productId, email },
    { product: productId, email, user: req.user?._id, notified: false },
    { upsert: true, new: true }
  );

  res.json({ success: true, message: "We'll notify you when it's back in stock!" });
};

exports.notifyAll = async (productId) => {
  const product = await Product.findById(productId);
  if (!product || product.stock === 0) return;

  const alerts = await BackInStockAlert.find({ product: productId, notified: false });
  for (const alert of alerts) {
    try {
      await sendEmail({
        to: alert.email,
        subject: `✨ ${product.name} is back in stock!`,
        html: `<div style="font-family:sans-serif;max-width:500px;margin:auto">
          <h2 style="color:#ec4899">Good news! 🎉</h2>
          <p><strong>${product.name}</strong> is back in stock at GlowBox Cosmetics!</p>
          <a href="${process.env.FRONTEND_URL}/products/${product.slug}" style="display:inline-block;background:#ec4899;color:white;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold">
            Shop Now →
          </a>
          <p style="color:#888;font-size:12px;margin-top:20px">Hurry — stocks are limited!</p>
        </div>`,
      });
      alert.notified = true;
      alert.notifiedAt = new Date();
      await alert.save();
    } catch (_) {}
  }
};

exports.getAlerts = async (req, res) => {
  const alerts = await BackInStockAlert.find({ notified: false }).populate('product', 'name stock');
  res.json({ success: true, alerts });
};
