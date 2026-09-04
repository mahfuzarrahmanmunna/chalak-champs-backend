import mongoose, { Document, Schema } from "mongoose";

export interface IEnrollment extends Document {
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  status: "active" | "expired" | "revoked";
  enrolledAt: Date;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    status: {
      type: String,
      enum: ["active", "expired", "revoked"],
      default: "active",
    },
    enrolledAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Compound index to prevent duplicate enrollments
EnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

export default mongoose.model<IEnrollment>("Enrollment", EnrollmentSchema);
