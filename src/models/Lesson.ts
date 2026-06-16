import mongoose, { Document, Schema } from "mongoose";

export interface ILesson extends Document {
  module: mongoose.Types.ObjectId;
  title: { en: string; bn: string }; // CHANGED: Support Object
  type: "video" | "pdf" | "exam" | "capstone";
  videoUrl?: string;
  content: any;
  order: number;
  duration: number;
  resources: string[];
  quiz?: {
    questionText: string;
    options: string[];
    correctAnswer: number;
  }[];
  isFreePreview: boolean;
}

const LessonSchema = new Schema(
  {
    module: { type: Schema.Types.ObjectId, ref: "Module", required: true },
    // Schema Type Change to Mixed/Object
    title: {
      type: Schema.Types.Mixed,
      required: true,
      default: { en: "", bn: "" },
    },
    videoUrl: { type: String },
    content: {
      type: Schema.Types.Mixed,
      required: true,
      default: { blocks: [] },
    },
    order: { type: Number, required: true, default: 0 },
    duration: { type: Number, default: 0 },
    resources: [{ type: String }],
    quiz: [
      {
        questionText: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctAnswer: { type: Number, required: true },
      },
    ],
    isFreePreview: { type: Boolean, default: false },
  },
  { timestamps: true },
);

LessonSchema.index({ module: 1, order: 1 });

const Lesson = mongoose.model<ILesson>("Lesson", LessonSchema);
export default Lesson;
