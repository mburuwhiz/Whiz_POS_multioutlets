import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense extends Document {
  businessId: mongoose.Types.ObjectId;
  description: string;
  amount: number;
  category: string;
  date: Date;
  notes?: string;
}

const ExpenseSchema: Schema = new Schema({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  date: { type: Date, required: true },
  notes: { type: String },
}, { timestamps: true });

export default mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);
