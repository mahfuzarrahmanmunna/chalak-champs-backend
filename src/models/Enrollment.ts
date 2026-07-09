import mongoose, { Document, Schema } from "mongoose";

export interface IEnrollment extends Document {
  name: string;
  phone: string;
  email?: string;
  courseId: string;
  courseTitle: string;
  amount: string;
  createdAt: Date;
}

const EnrollmentSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: false, default: undefined },
    courseId: { type: String, required: true },
    courseTitle: { type: String, required: true },
    amount: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IEnrollment>("Enrollment", EnrollmentSchema);
