import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
  studentName: string;
  guardianName: string;
  countryCode: string;
  phone: string;
  classLevel: string;
  message?: string;
  contactMethod: "call" | "whatsapp";
  isResolved: boolean;
}

const ContactSchema = new Schema<IContact>(
  {
    studentName: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },
    guardianName: {
      type: String,
      required: [true, "Guardian name is required"],
      trim: true,
    },
    countryCode: {
      type: String,
      required: true,
      default: "+880",
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    classLevel: {
      type: String,
      required: [true, "Class level is required"],
    },
    message: {
      type: String,
      trim: true,
      default: "",
    },
    contactMethod: {
      type: String,
      enum: ["call", "whatsapp"],
      default: "whatsapp",
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }, // Automatically adds createdAt and updatedAt
);

export default mongoose.model<IContact>("Contact", ContactSchema);
