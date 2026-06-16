import mongoose, { Document, Schema } from "mongoose";

export interface IQuestion extends Document {
  type: "mcq" | "fill-blank" | "short-answer" | "essay";
  text: string;
  options?: string[]; 
  correctAnswer: string | string[]; 
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  subject?: string;
  image?: string; // URL to question image
}

const QuestionSchema: Schema = new Schema(
  {
    type: {
      type: String,
      enum: ["mcq", "fill-blank", "short-answer", "essay"],
      required: true,
    },
    text: { type: String, required: true },
    options: [{ type: String }],
    correctAnswer: Schema.Types.Mixed, // Can be String or Array
    explanation: String,
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    marks: { type: Number, default: 1 },
    subject: String,
    image: String,
  },
  { timestamps: true },
);

export default mongoose.model<IQuestion>("Question", QuestionSchema);