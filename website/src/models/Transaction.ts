import mongoose from 'mongoose';

const TransactionItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true },
  sku: { type: String },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  total: { type: Number, required: true },
});

const TransactionSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  transactionId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['sale', 'refund', 'expense'], default: 'sale' },
  items: [TransactionItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  cashier: { type: String },
  customer: { type: String },
  notes: { type: String },
  status: { type: String, enum: ['completed', 'voided', 'pending'], default: 'completed' },
  lastSyncAt: { type: Date },
}, {
  timestamps: true
});

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
