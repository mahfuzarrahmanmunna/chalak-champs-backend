// src/models/Module.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IModule extends Document {
  title: string;
  titleBn?: string;
  description?: string;
  order: number;
  courseId: mongoose.Types.ObjectId;
  thumbnail?: string; // NEW
  videoUrl?: string; // NEW
  isPublished: boolean;
  scheduledPublishAt?: Date;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ModuleSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Module title is required"],
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
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    thumbnail: {
      type: String, // Cloudinary URL
    },
    videoUrl: {
      type: String, // Cloudinary URL
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    scheduledPublishAt: {
      type: Date,
    },
    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IModule>("Module", ModuleSchema);
