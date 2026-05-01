// // src/models/Lesson.ts
// import mongoose, { Document, Schema } from "mongoose";

// export interface ILesson extends Document {
//   title: string;
//   titleBn?: string;
//   description?: string;
//   descriptionBn?: string;
//   content?: string;
//   videoUrl?: string;
//   duration?: number;
//   order: number;
//   isPublished: boolean;
//   isFree: boolean;
//   courseId: mongoose.Types.ObjectId;
//   resources: IResource[];
//   createdAt: Date;
//   updatedAt: Date;
// }

// export interface IResource {
//   title: string;
//   type: "pdf" | "video" | "link" | "document";
//   url: string;
//   size?: number;
// }

// const ResourceSchema = new Schema(
//   {
//     title: { type: String, required: true },
//     type: {
//       type: String,
//       required: true,
//       enum: ["pdf", "video", "link", "document"],
//     },
//     url: { type: String, required: true },
//     size: { type: Number },
//   },
//   { _id: false },
// );

// const LessonSchema: Schema = new Schema(
//   {
//     title: {
//       type: String,
//       required: [true, "Lesson title is required"],
//       trim: true,
//     },
//     titleBn: {
//       type: String,
//       trim: true,
//     },
//     description: {
//       type: String,
//       trim: true,
//     },
//     descriptionBn: {
//       type: String,
//       trim: true,
//     },
//     content: {
//       type: String,
//     },
//     videoUrl: {
//       type: String,
//     },
//     duration: {
//       type: Number,
//       min: 0,
//     },
//     order: {
//       type: Number,
//       required: true,
//     },
//     isPublished: {
//       type: Boolean,
//       default: false,
//     },
//     isFree: {
//       type: Boolean,
//       default: false,
//     },
//     courseId: {
//       type: Schema.Types.ObjectId,
//       ref: "Course",
//       required: true,
//     },
//     resources: [ResourceSchema],
//   },
//   {
//     timestamps: true,
//   },
// );

// export default mongoose.model<ILesson>("Lesson", LessonSchema);

import mongoose, { Document, Schema } from "mongoose";

// Simple Quiz Interface embedded in Lesson
export interface IQuizQuestion {
  questionText: string;
  options: string[];
  correctAnswer: number; // Index of correct option
  points?: number;
}

export interface ILesson extends Document {
  module: mongoose.Types.ObjectId;
  title: string;
  videoUrl?: string; // Optional video for this specific lesson
  content: any; // Editor.js JSON output (Schema.Types.Mixed)
  order: number;
  duration: number; // Duration in minutes
  resources: string[]; // Array of PDF URLs
  quiz?: IQuizQuestion[]; // Homework/Quiz attached to this lesson
  isFreePreview: boolean;
}

const LessonSchema = new Schema(
  {
    module: {
      type: Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    videoUrl: {
      type: String,
    },
    // This stores the Editor.js blocks object
    content: {
      type: Schema.Types.Mixed,
      required: true,
      default: { blocks: [] },
    },
    order: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number, // in minutes
      default: 0,
    },
    resources: [
      {
        type: String, // Cloudinary URLs
      },
    ],
    quiz: [
      {
        questionText: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctAnswer: { type: Number, required: true },
        points: { type: Number, default: 1 },
      },
    ],
    isFreePreview: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Index for fetching lessons of a module quickly
LessonSchema.index({ module: 1, order: 1 });

const Lesson = mongoose.model<ILesson>("Lesson", LessonSchema);
export default Lesson;