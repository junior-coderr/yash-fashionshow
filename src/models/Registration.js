import mongoose from "mongoose";

const { Schema } = mongoose;

const registrationSchema = new Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  age: {
    type: Number,
    required: [true, "Age is required"],
    min: [1, "Age must be positive"],
  },
  gender: {
    type: String,
    required: [true, "Gender is required"],
    enum: ["male", "female", "other"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    trim: true,
    lowercase: true,
    match: [/\S+@\S+\.\S+/, "Please enter a valid email"],
  },
  phone: {
    type: String,
    required: [true, "Phone number is required"],
    match: [/^\d{10}$/, "Please enter a valid 10-digit phone number"],
  },
  educationStatus: {
    type: String,
    required: [true, "Education status is required"],
    enum: ["inCollege", "school", "none"],
  },
  participationCategories: {
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
  },
  utrId: {
    type: String,
    required: [true, "UTR ID is required"],
    trim: true,
  },
  paymentScreenshotUrl: {
    type: String,
    required: [true, "Payment screenshot is required"],
  },
  registrationId: {
    type: String,
    unique: true,
    default: () => "FAS-" + Math.floor(100000 + Math.random() * 900000),
  },
  registrationDate: {
    type: Date,
    default: Date.now,
  },
  totalAmount: {
    type: Number,
    required: [true, "Total amount is required"],
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending",
  },
  qrCodeImage: {
    type: String,
  },
  entryVerified: {
    type: Boolean,
    default: false,
  },
  entryTimestamp: {
    type: Date,
  },
});

// Check if model already exists to prevent overwrite in development with hot reloading
const Registration =
  mongoose.models.Registration ||
  mongoose.model("Registration", registrationSchema);

export default Registration;
