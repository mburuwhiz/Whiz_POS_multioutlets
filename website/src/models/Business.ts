import mongoose from 'mongoose';

const BusinessSchema = new mongoose.Schema({
  name: { type: String, required: true },
  emailPrefix: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String },
  phone: { type: String },
  address: { type: String },
  receiptFooter: { type: String },
  taxRate: { type: Number, default: 0 },
  currency: { type: String, default: 'KES' },
  status: { type: String, default: 'Active' },
  apiKey: { type: String, required: true },
  dataFolder: { type: String, required: true },
  oneTimePassword: { type: String },
  mustChangePassword: { type: Boolean, default: true },
}, {
  timestamps: true
});

export default mongoose.models.Business || mongoose.model('Business', BusinessSchema);
