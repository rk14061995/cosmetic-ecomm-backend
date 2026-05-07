const GiftCard = require('../models/GiftCard');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');

const DENOMINATIONS = [250, 500, 1000, 2000, 5000];

exports.getDenominations = async (req, res) => {
  res.json({ success: true, denominations: DENOMINATIONS });
};

exports.purchase = async (req, res) => {
  const { amount, recipientEmail, recipientName, message } = req.body;
  if (!DENOMINATIONS.includes(Number(amount)))
    return res.status(400).json({ success: false, message: 'Invalid gift card amount' });

  const giftCard = await GiftCard.create({
    amount, balance: amount,
    purchasedBy: req.user._id,
    recipientEmail, recipientName, message,
  });

  try {
    await sendEmail({
      to: recipientEmail,
      subject: `🎁 You've received a GlowBox gift card worth ₹${amount}!`,
      html: `<div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#ec4899">🎁 Gift Card from GlowBox Cosmetics</h2>
        <p>Hi ${recipientName},</p>
        <p>${req.user.name} has sent you a gift card worth <strong>₹${amount}</strong>!</p>
        ${message ? `<blockquote style="border-left:3px solid #ec4899;padding-left:12px;color:#555">${message}</blockquote>` : ''}
        <div style="background:#fdf2f8;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
          <p style="margin:0;font-size:12px;color:#888">Your Gift Card Code</p>
          <p style="font-size:28px;font-weight:bold;letter-spacing:4px;color:#ec4899;margin:8px 0">${giftCard.code}</p>
          <p style="margin:0;font-size:12px;color:#888">Valid till ${giftCard.expiresAt.toLocaleDateString('en-IN')}</p>
        </div>
        <p>Use this code at checkout on <a href="${process.env.FRONTEND_URL}" style="color:#ec4899">GlowBox Cosmetics</a></p>
      </div>`,
    });
  } catch (_) {}

  res.status(201).json({ success: true, giftCard });
};

exports.validate = async (req, res) => {
  const { code } = req.body;
  const card = await GiftCard.findOne({ code: code?.toUpperCase() });
  if (!card) return res.status(404).json({ success: false, message: 'Invalid gift card code' });
  if (card.isRedeemed || card.balance <= 0) return res.status(400).json({ success: false, message: 'Gift card already used' });
  if (card.expiresAt < new Date()) return res.status(400).json({ success: false, message: 'Gift card expired' });
  res.json({ success: true, balance: card.balance, code: card.code });
};

exports.redeem = async (req, res) => {
  const { code, amount } = req.body;
  const card = await GiftCard.findOne({ code: code?.toUpperCase() });
  if (!card || card.balance < amount)
    return res.status(400).json({ success: false, message: 'Invalid or insufficient gift card' });

  card.balance -= amount;
  if (card.balance === 0) { card.isRedeemed = true; card.redeemedAt = new Date(); card.redeemedBy = req.user._id; }
  await card.save();
  res.json({ success: true, remaining: card.balance });
};

exports.getMyCards = async (req, res) => {
  const cards = await GiftCard.find({ purchasedBy: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, cards });
};
