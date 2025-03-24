import mongoose from "mongoose";

const PaymentQRSchema = new mongoose.Schema({
  // Category combination flags
  modelWalk: {
    type: Boolean,
    default: false,
  },
  dance: {
    type: Boolean,
    default: false,
  },
  movieSelection: {
    type: Boolean,
    default: false,
  },
  // URL to the QR image in Azure Blob Storage
  qrImageUrl: {
    type: String,
    required: true,
  },
  // Name for this QR code (optional, for admin reference)
  name: {
    type: String,
    default: "",
  },
  // When this QR image was last updated
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  // Status
  isActive: {
    type: Boolean,
    default: true,
  }
});

// Add a unique compound index for the category combinations
PaymentQRSchema.index(
  { modelWalk: 1, dance: 1, movieSelection: 1 },
  { unique: true }
);

export default mongoose.models.PaymentQR || mongoose.model("PaymentQR", PaymentQRSchema);