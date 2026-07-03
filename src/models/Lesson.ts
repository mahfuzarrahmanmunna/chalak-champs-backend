// src/models/Lesson.ts

import mongoose, { Document, Schema } from "mongoose";

export interface ILesson extends Document {
  module: mongoose.Types.ObjectId;
  title: {
    en: string;
    bn: string;
  };
  type: "video" | "pdf" | "exam" | "capstone" | "article";
  videoUrl?: string;
  content?: string;
  order: number;
  duration?: number;
  isFreePreview: boolean;
  resources?: any[];
  quiz?: any[];

  // ✅ NEW: Link to Exam for exam-type lessons
  examId?: mongoose.Types.ObjectId;
  examConfig?: {
    duration: number;
    passingMarks: number;
    negativeMarking: number;
    isProctored: boolean;
    totalQuestions: number;
    totalMarks: number;
  };

  createdAt?: Date;
  updatedAt?: Date;
}

const LessonSchema = new Schema(
  {
    module: {
      type: Schema.Types.ObjectId,
      ref: "Module",
      required: true,
      index: true,
    },
    title: {
      en: { type: String, required: true, default: "" },
      bn: { type: String, default: "" },
    },
    type: {
      type: String,
      enum: ["video", "pdf", "exam", "capstone", "article"],
      default: "video",
      required: true,
    },
    videoUrl: { type: String },
    content: { type: String },
    order: { type: Number, required: true, default: 0 },
    duration: { type: Number, default: 0 },
    isFreePreview: { type: Boolean, default: false },
    resources: [{ type: Schema.Types.Mixed }],
    quiz: [{ type: Schema.Types.Mixed }],

    // ✅ NEW: Exam integration fields
    examId: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      default: null,
    },
    examConfig: {
      duration: { type: Number, default: 60 },
      passingMarks: { type: Number, default: 50 },
      negativeMarking: { type: Number, default: 0 },
      isProctored: { type: Boolean, default: true },
      totalQuestions: { type: Number, default: 0 },
      totalMarks: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

// Index for querying lessons by exam
LessonSchema.index({ examId: 1 });

export default mongoose.model<ILesson>("Lesson", LessonSchema);
