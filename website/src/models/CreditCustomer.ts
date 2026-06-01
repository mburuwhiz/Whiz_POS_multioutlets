import mongoose from 'mongoose';

const CreditCustomerSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  creditLimit: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  lastSyncAt: { type: Date },
}, {
  timestamps: true
});

export default mongoose.models.CreditCustomer || mongoose.model('CreditCustomer', CreditCustomerSchema);
