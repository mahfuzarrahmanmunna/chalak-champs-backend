import mongoose, { Document, Schema } from "mongoose";

// --- Reusable Bilingual Schema ---
const BilingualSchema = new Schema(
  {
    en: { type: String, default: "" },
    bn: { type: String, default: "" },
  },
  { _id: false }, // Prevents Mongoose from creating _id for nested objects
);

// Interfaces for the complex data structures
export interface IBilingualText {
  en: string;
  bn: string;
}

export interface ILevel {
  title: IBilingualText;
  description: IBilingualText;
  target: IBilingualText; // Changed from targetAudience to match frontend
  topics: string[];
}

export interface IFeature {
  title: IBilingualText;
  desc: IBilingualText; // Changed from description to match frontend
}

export interface IFaq {
  question: string; // Kept as string because your frontend maps it to just English
  answer: string;
}

export interface ICourse extends Document {
  _id: mongoose.Types.ObjectId;
  title: IBilingualText;
  heroSubtitle: IBilingualText;
  description: IBilingualText;
  instructor: mongoose.Types.ObjectId;
  instructorName?: string;
  duration?: string;
  price: number;
  originalPrice?: number;
  thumbnail?: string;
  thumbnailDeleteUrl?: string;
  videoUrl?: string;
  videoDeleteUrl?: string;
  quickInfo: string[]; // Kept as string[] because frontend maps to just English
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
    // ✅ UPDATED: Now accepts { en: "", bn: "" }
    title: { type: BilingualSchema, required: true },

    // ✅ UPDATED: Now accepts { en: "", bn: "" } (Made optional to prevent errors on empty forms)
    heroSubtitle: { type: BilingualSchema },

    // Already bilingual, no changes needed
    description: { type: BilingualSchema, default: { en: "", bn: "" } },

    instructor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    instructorName: { type: String },
    duration: { type: String },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    thumbnail: { type: String },
    thumbnailDeleteUrl: { type: String },
    videoUrl: { type: String },
    videoDeleteUrl: { type: String },
    quickInfo: { type: [String], default: [] },
    offerDetails: { type: String },
    courseOverview: { type: String },

    // ✅ UPDATED: Nested fields now use BilingualSchema
    levels: [
      {
        title: { type: BilingualSchema, default: { en: "", bn: "" } },
        description: { type: BilingualSchema, default: { en: "", bn: "" } },
        target: { type: BilingualSchema, default: { en: "", bn: "" } }, // Matches frontend "target"
        topics: { type: [String], default: [] },
      },
    ],

    // ✅ UPDATED: Nested fields now use BilingualSchema
    features: [
      {
        title: { type: BilingualSchema, default: { en: "", bn: "" } },
        desc: { type: BilingualSchema, default: { en: "", bn: "" } }, // Matches frontend "desc"
      },
    ],

    // ✅ Kept as simple strings because your frontend strips the bn object for FAQs
    faqs: [
      {
        question: { type: String, default: "" },
        answer: { type: String, default: "" },
      },
    ],

    category: { type: String },

    // ✅ FIXED: Changed to lowercase to match frontend select values
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "all"],
    },

    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.model<ICourse>("Course", CourseSchema);
