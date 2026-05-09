// src/models/FreeBooking.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IFreeBooking extends Document {
  studentName: string;
  guardianName: string;
  phone: string;
  countryCode: string;
  fullPhone: string;
  studentClass: string;
  course: string;
  createdAt: Date;
}

const FreeBookingSchema: Schema = new Schema(
  {
    studentName: { type: String, required: true },
    guardianName: { type: String, required: true },
    phone: { type: String, required: true },
    countryCode: { type: String, required: true },
    fullPhone: { type: String, required: true },
    studentClass: { type: String, required: true },
    course: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IFreeBooking>("FreeBooking", FreeBookingSchema);