import mongoose, { Document, Schema } from "mongoose";

export interface IEnrollment extends Document {
  courseId: string;
  courseTitle: string;
  name: string;
  phone: string;
  amount: string;
  status: "pending" | "completed" | "cancelled";
  createdAt: Date;
}

const EnrollmentSchema: Schema = new Schema(
  {
    courseId: { type: String, required: true },
    courseTitle: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    amount: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IEnrollment>("Enrollment", EnrollmentSchema);
