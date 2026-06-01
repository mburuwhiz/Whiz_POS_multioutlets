import mongoose from 'mongoose';

const POSUserSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  username: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String },
  pin: { type: String, required: true },
  passwordChangeRequired: { type: Boolean, default: false },
  role: { type: String, enum: ['admin', 'manager', 'cashier'], default: 'cashier' },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date },
  lastSyncAt: { type: Date },
}, {
  timestamps: true
});

export default mongoose.models.POSUser || mongoose.model('POSUser', POSUserSchema);
