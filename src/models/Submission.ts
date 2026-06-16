import mongoose, { Document, Schema } from "mongoose";

export interface IProctorFlag {
  timestamp: Date;
  type: string;
  riskLevel: "low" | "medium" | "high";
  message: string;
}

export interface BilingualText {
  en: string;
  bn: string;
}

export interface ISubmission extends Document {
  exam: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  answers: { questionId: mongoose.Types.ObjectId; answer: any }[];

  // Grading Fields
  score: number; // The final score (can be auto-graded or teacher-graded)
  status: "in-progress" | "submitted" | "graded" | "flagged";
  gradingStatus?: "pending_review" | "graded"; // Tracks if a teacher has reviewed it

  // Teacher Review Data
  reviewerId?: mongoose.Types.ObjectId; // ID of the teacher who graded it
  reviewerFeedback?: BilingualText; // Teacher's notes
  reviewedAt?: Date;

  // Proctoring
  proctorFlags: IProctorFlag[];
  riskScore: number;
  startTime: Date;
  endTime?: Date;
  createdAt?: Date;
}

const ProctorFlagSchema = new Schema({
  timestamp: { type: Date, default: Date.now },
  type: String,
  riskLevel: { type: String, enum: ["low", "medium", "high"] },
  message: String,
});

const SubmissionSchema: Schema = new Schema(
  {
    exam: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    answers: [
      {
        questionId: { type: Schema.Types.ObjectId, ref: "Question" },
        answer: Schema.Types.Mixed,
      },
    ],
    score: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["in-progress", "submitted", "graded", "flagged"],
      default: "in-progress",
    },
    gradingStatus: {
      type: String,
      enum: ["pending_review", "graded"],
    },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User" },
    reviewerFeedback: {
      en: { type: String, default: "" },
      bn: { type: String, default: "" },
    },
    reviewedAt: { type: Date },
    proctorFlags: [ProctorFlagSchema],
    riskScore: { type: Number, default: 0 },
    startTime: { type: Date, default: Date.now },
    endTime: Date,
  },
  { timestamps: true },
);

export default mongoose.model<ISubmission>("Submission", SubmissionSchema);
