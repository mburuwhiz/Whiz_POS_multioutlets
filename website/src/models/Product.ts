import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true },
  sku: { type: String },
  barcode: { type: String },
  category: { type: String },
  price: { type: Number, required: true },
  cost: { type: Number },
  quantity: { type: Number, default: 0 },
  lowStockAlert: { type: Number, default: 10 },
  image: { type: String },
  isActive: { type: Boolean, default: true },
  lastSyncAt: { type: Date },
}, {
  timestamps: true
});

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
