import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  businessId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#3B82F6' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

CategorySchema.index({ businessId: 1, name: 1 }, { unique: true });

export default mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
