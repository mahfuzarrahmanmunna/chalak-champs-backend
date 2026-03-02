// src/models/Course.ts
import mongoose, { Document, Schema } from "mongoose";

export interface ICourse extends Document {
  title: string;
  titleBn?: string;
  description: string;
  descriptionBn?: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  language: "en" | "bn";
  price: number;
  thumbnail?: string;
  videoUrl?: string;
  duration?: number; // in minutes
  status: "draft" | "published" | "archived";
  isPublished: boolean;
  publishedAt?: Date;
  instructor: mongoose.Types.ObjectId;
  tags: string[];
  objectives: string[];
  requirements: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
    },
    titleBn: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      minlength: [10, "Description must be at least 10 characters"],
    },
    descriptionBn: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "competition-prep",
        "language",
        "school-subjects",
        "skill-development",
        "other",
      ],
    },
    level: {
      type: String,
      required: [true, "Level is required"],
      enum: ["beginner", "intermediate", "advanced"],
    },
    language: {
      type: String,
      enum: ["en", "bn"],
      default: "en",
    },
    price: {
      type: Number,
      required: true,
      min: [0, "Price must be non-negative"],
      default: 0,
    },
    thumbnail: {
      type: String,
    },
    videoUrl: {
      type: String,
    },
    duration: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: { type: Date },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    objectives: [
      {
        type: String,
        trim: true,
      },
    ],
    requirements: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Index for search functionality
CourseSchema.index({
  title: "text",
  description: "text",
  titleBn: "text",
  descriptionBn: "text",
});

const Course = mongoose.model<ICourse>("Course", CourseSchema);
export default Course;
export { Course };
