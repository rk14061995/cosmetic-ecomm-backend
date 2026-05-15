const Expense = require('../models/Expense');

exports.getExpenses = async (req, res) => {
  const { from, to } = req.query;
  const query = {};
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = toDate;
    }
  }
  const expenses = await Expense.find(query).sort({ createdAt: -1 });
  res.json({ success: true, expenses });
};

exports.createExpense = async (req, res) => {
  const { name, amount, note } = req.body;
  if (!name || amount == null) {
    return res.status(400).json({ success: false, message: 'Name and amount are required' });
  }
  const expense = await Expense.create({ name, amount: Number(amount), note });
  res.status(201).json({ success: true, expense });
};

exports.updateExpense = async (req, res) => {
  const { name, amount, note } = req.body;
  const expense = await Expense.findByIdAndUpdate(
    req.params.id,
    { name, amount: amount != null ? Number(amount) : undefined, note },
    { new: true, runValidators: true }
  );
  if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
  res.json({ success: true, expense });
};

exports.deleteExpense = async (req, res) => {
  const expense = await Expense.findByIdAndDelete(req.params.id);
  if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
  res.json({ success: true, message: 'Expense deleted' });
};
