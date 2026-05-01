import mongoose, { Document, Schema } from "mongoose";

export interface IBatch extends Document {
  course: mongoose.Types.ObjectId;
  name: string; // e.g., "Spring 2024", "Batch-50"
  instructor: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  maxSeats: number;
  enrolledStudents: mongoose.Types.ObjectId[];
  isActive: boolean;
  schedule: {
    days: string[]; // ["Monday", "Wednesday"]
    time: string; // "10:00 AM"
  };
}

const BatchSchema = new Schema(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    name: {
      type: String,
      required: true, // e.g., "January Intake"
    },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    maxSeats: {
      type: Number,
      default: 50,
    },
    enrolledStudents: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    schedule: {
      days: [String],
      time: String,
    },
  },
  { timestamps: true },
);

// Composite index to quickly find active batches for a course
BatchSchema.index({ course: 1, isActive: 1 });

const Batch = mongoose.model<IBatch>("Batch", BatchSchema);
export default Batch;
