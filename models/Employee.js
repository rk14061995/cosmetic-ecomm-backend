const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema({ name: { type: String, required: true, trim: true }, amount: { type: Number, required: true, min: 0 } }, { _id: false });

const salaryRecordSchema = new mongoose.Schema({
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  amount: { type: Number, required: true, min: 0 },
  paymentMode: { type: String, default: 'Bank Transfer' },
  totalDays: { type: Number },
  presentDays: { type: Number },
  paidAt: { type: Date, default: Date.now },
  note: { type: String, trim: true },
});

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    joiningDate: { type: Date },
    monthlySalary: { type: Number, required: true, min: 0 },
    allowances: [componentSchema],
    deductions: [componentSchema],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    salaryRecords: [salaryRecordSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Employee', employeeSchema);
