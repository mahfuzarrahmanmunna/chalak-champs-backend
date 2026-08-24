import mongoose, { Schema } from "mongoose";

const ProgressSchema = new Schema(
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
    completedLessons: [{ type: Schema.Types.ObjectId, ref: "Lesson" }],
    lastAccessedLesson: { type: Schema.Types.ObjectId, ref: "Lesson" },
  },
  { timestamps: true },
);

// Ensure one progress document per user per course
ProgressSchema.index({ user: 1, course: 1 }, { unique: true });

export default mongoose.model("Progress", ProgressSchema);
