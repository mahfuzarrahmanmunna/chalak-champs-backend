// src/models/CtaBooking.ts
import mongoose, { Document, Schema } from "mongoose";

export interface ICtaBooking extends Document {
  studentName: string;
  fatherName: string;
  phone: string;
  countryCode: string;
  fullPhone: string;
  studentClass: string;
  countryName: string;
  countryFlag: string;
  countryCca2: string;
  createdAt: Date;
  updatedAt: Date;
}

const CtaBookingSchema: Schema = new Schema(
  {
    studentName: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },
    fatherName: {
      type: String,
      required: [true, "Father name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    countryCode: {
      type: String,
      required: [true, "Country code is required"],
      trim: true,
    },
    fullPhone: {
      type: String,
      required: [true, "Full phone number is required"],
      trim: true,
    },
    studentClass: {
      type: String,
      required: [true, "Class is required"],
      trim: true,
    },
    countryName: {
      type: String,
      default: "",
      trim: true,
    },
    countryFlag: {
      type: String,
      default: "",
      trim: true,
    },
    countryCca2: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Index for faster queries
CtaBookingSchema.index({ createdAt: -1 });

export default mongoose.models.CtaBooking ||
  mongoose.model<ICtaBooking>("CtaBooking", CtaBookingSchema);
