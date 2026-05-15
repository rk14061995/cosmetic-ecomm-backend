const Employee = require('../models/Employee');

exports.getEmployees = async (req, res) => {
  const employees = await Employee.find().sort({ createdAt: -1 });
  res.json({ success: true, employees });
};

exports.getEmployee = async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
  res.json({ success: true, employee });
};

function parseComponents(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(c => c.name && c.amount != null).map(c => ({ name: String(c.name).trim(), amount: Number(c.amount) }));
}

exports.createEmployee = async (req, res) => {
  const { name, role, phone, email, joiningDate, monthlySalary, status, allowances, deductions } = req.body;
  if (!name || !role || monthlySalary == null) {
    return res.status(400).json({ success: false, message: 'Name, role, and monthly salary are required' });
  }
  const employee = await Employee.create({
    name, role, phone, email, joiningDate, status,
    monthlySalary: Number(monthlySalary),
    allowances: parseComponents(allowances),
    deductions: parseComponents(deductions),
  });
  res.status(201).json({ success: true, employee });
};

exports.updateEmployee = async (req, res) => {
  const { name, role, phone, email, joiningDate, monthlySalary, status, allowances, deductions } = req.body;
  const update = { name, role, phone, email, joiningDate, status };
  if (monthlySalary != null) update.monthlySalary = Number(monthlySalary);
  if (allowances !== undefined) update.allowances = parseComponents(allowances);
  if (deductions !== undefined) update.deductions = parseComponents(deductions);

  const employee = await Employee.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
  res.json({ success: true, employee });
};

exports.deleteEmployee = async (req, res) => {
  const employee = await Employee.findByIdAndDelete(req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
  res.json({ success: true, message: 'Employee deleted' });
};

exports.paySalary = async (req, res) => {
  const { month, year, amount, paymentMode, totalDays, presentDays, note } = req.body;
  if (!month || !year) return res.status(400).json({ success: false, message: 'Month and year are required' });

  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  const alreadyPaid = employee.salaryRecords.find(
    (r) => r.month === Number(month) && r.year === Number(year)
  );
  if (alreadyPaid) {
    return res.status(400).json({ success: false, message: `Salary for ${month}/${year} already recorded` });
  }

  employee.salaryRecords.push({
    month: Number(month),
    year: Number(year),
    amount: amount != null ? Number(amount) : employee.monthlySalary,
    paymentMode: paymentMode || 'Bank Transfer',
    totalDays: totalDays ? Number(totalDays) : undefined,
    presentDays: presentDays ? Number(presentDays) : undefined,
    note,
  });
  await employee.save();
  res.json({ success: true, employee });
};

exports.deleteSalaryRecord = async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  employee.salaryRecords = employee.salaryRecords.filter(
    (r) => r._id.toString() !== req.params.recordId
  );
  await employee.save();
  res.json({ success: true, employee });
};
