// src/models/Lesson.ts
import mongoose, { Document, Schema } from "mongoose";

export interface ILesson extends Document {
  title: string;
  titleBn?: string;
  description?: string;
  descriptionBn?: string;
  content?: string;
  videoUrl?: string;
  duration?: number;
  order: number;
  isPublished: boolean;
  isFree: boolean;
  courseId: mongoose.Types.ObjectId;
  resources: IResource[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IResource {
  title: string;
  type: "pdf" | "video" | "link" | "document";
  url: string;
  size?: number;
}

const ResourceSchema = new Schema(
  {
    title: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["pdf", "video", "link", "document"],
    },
    url: { type: String, required: true },
    size: { type: Number },
  },
  { _id: false },
);

const LessonSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Lesson title is required"],
      trim: true,
    },
    titleBn: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    descriptionBn: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
    },
    videoUrl: {
      type: String,
    },
    duration: {
      type: Number,
      min: 0,
    },
    order: {
      type: Number,
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    resources: [ResourceSchema],
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<ILesson>("Lesson", LessonSchema);
