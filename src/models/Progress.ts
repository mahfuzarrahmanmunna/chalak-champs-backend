import mongoose, { Schema, Document } from "mongoose";

// ✅ Define the TypeScript Interface
export interface IProgress extends Document {
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  completedLessons: mongoose.Types.ObjectId[];
  lastAccessedModule?: mongoose.Types.ObjectId;
  lastAccessedLesson?: mongoose.Types.ObjectId;
  progressPercentage: number;
}

const ProgressSchema = new Schema<IProgress>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    completedLessons: [
      {
        type: Schema.Types.ObjectId,
        ref: "Lesson",
      },
    ],
    lastAccessedModule: {
      type: Schema.Types.ObjectId,
      ref: "Module",
    },
    lastAccessedLesson: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
    },
    progressPercentage: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Ensure one progress document per user per course
ProgressSchema.index({ user: 1, course: 1 }, { unique: true });

export default mongoose.model<IProgress>("Progress", ProgressSchema);
