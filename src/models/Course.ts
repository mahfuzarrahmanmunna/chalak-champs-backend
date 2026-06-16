import mongoose, { Document, Schema } from "mongoose";

// Interfaces for the complex data structures
export interface ILevel {
  title: string;
  description: string;
  targetAudience: string;
  topics: string[];
}

export interface IFeature {
  title: string;
  description: string;
}

export interface IFaq {
  question: string;
  answer: string;
}

export interface ICourse extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  heroSubtitle: string;
  description: {
    en: string;
    bn: string;
  };
  instructor: mongoose.Types.ObjectId;
  instructorName?: string; // <--- ADDED THIS
  duration?: string; // <--- ADDED THIS
  price: number;
  originalPrice?: number;
  thumbnail?: string;
  thumbnailDeleteUrl?: string;
  videoUrl?: string;
  videoDeleteUrl?: string;
  quickInfo: string[];
  offerDetails?: string;
  courseOverview?: string;
  levels: ILevel[];
  features: IFeature[];
  faqs: IFaq[];
  category?: string;
  level?: string;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const CourseSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    heroSubtitle: { type: String, required: true },
    description: {
      en: { type: String, default: "" },
      bn: { type: String, default: "" },
    },
    instructor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    instructorName: { type: String }, // <--- ADDED THIS
    duration: { type: String }, // <--- ADDED THIS
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    thumbnail: { type: String },
    thumbnailDeleteUrl: { type: String },
    videoUrl: { type: String },
    videoDeleteUrl: { type: String },
    quickInfo: { type: [String], default: [] },
    offerDetails: { type: String },
    courseOverview: { type: String },
    levels: [
      {
        title: String,
        description: String,
        targetAudience: String,
        topics: [String],
      },
    ],
    features: [
      {
        title: String,
        description: {
          en: { type: String, default: "" },
          bn: { type: String, default: "" },
        },
      },
    ],
    faqs: [
      {
        question: String,
        answer: String,
      },
    ],
    category: { type: String },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.model<ICourse>("Course", CourseSchema);
