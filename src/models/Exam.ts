import mongoose, { Document, Schema } from "mongoose";
import { IQuestion } from "./Question";

export interface IExam extends Document {
  title: string;
  description?: string;
  duration: number; // in minutes
  totalMarks: number;
  passingMarks: number;
  negativeMarking: number;
  isProctored: boolean;
  mode: "ai-proctored" | "teacher-supervised" | "self-paced";

  // Question Configuration
  questionBank: mongoose.Types.ObjectId[]; // Array of Question IDs
  randomSelectionCount?: number; // If set, pick N random questions
  difficultyFilter?: string;

  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt?: Date;
}

const ExamSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    duration: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    passingMarks: { type: Number, required: true },
    negativeMarking: { type: Number, default: 0 },
    isProctored: { type: Boolean, default: true },
    mode: {
      type: String,
      enum: ["ai-proctored", "teacher-supervised", "self-paced"],
      default: "ai-proctored",
    },
    questionBank: [{ type: Schema.Types.ObjectId, ref: "Question" }],
    randomSelectionCount: Number,
    difficultyFilter: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model<IExam>("Exam", ExamSchema);
