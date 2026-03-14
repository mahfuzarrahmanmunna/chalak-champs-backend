import mongoose, { Document, Schema } from "mongoose";

export interface ICourse extends Document {
  title: string;
  description: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  language: "en" | "bn";
  price: number;
  originalPrice?: number;
  instructor: mongoose.Types.ObjectId;
  duration: string; // "12" (hours)
  publishDate: Date;
  startDate: Date;
  tags: string[];
  objectives: string[];
  requirements: string[];
  thumbnail?: string;
  videoUrl?: string;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Grammar",
        "Business",
        "Test Preparation",
        "Speaking",
        "Writing",
        "Literature",
        "Vocabulary",
        "Other",
      ],
    },
    level: {
      type: String,
      required: true,
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
      min: 0,
    },
    originalPrice: {
      type: Number,
    },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    duration: {
      type: String, // or Number if you prefer total hours
      required: true,
    },
    publishDate: {
      type: Date,
      required: true,
    },
    startDate: {
      type: Date,
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
    thumbnail: {
      type: String,
    },
    videoUrl: {
      type: String,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Index for search
CourseSchema.index({ title: "text", description: "text", tags: "text" });

const Course = mongoose.model<ICourse>("Course", CourseSchema);
export default Course;
