import mongoose from 'mongoose';

const InquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  company: { type: String },
  message: { type: String, required: true },
}, {
  timestamps: true
});

export default mongoose.models.Inquiry || mongoose.model('Inquiry', InquirySchema);
