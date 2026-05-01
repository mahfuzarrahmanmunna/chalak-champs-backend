import mongoose, { Document, Schema } from "mongoose";

// 1. Define the interface extending Document
// Ensure all properties used in CourseController are listed here
export interface ICourse extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  instructor: mongoose.Types.ObjectId; // <--- Missing in your file
  price: number;
  originalPrice?: number;
  thumbnail?: string; // <--- Missing in your file
  videoUrl?: string; // <--- Missing in your file
  objectives: string[];
  requirements: string[];
  tags: string[];
  category?: string;
  level?: string;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// 2. Create the Schema
const CourseSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User", // Links to the User model
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    originalPrice: {
      type: Number,
    },
    thumbnail: {
      type: String, // Stores Cloudinary URL
    },
    videoUrl: {
      type: String, // Stores Cloudinary URL
    },
    objectives: {
      type: [String],
      default: [],
    },
    requirements: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
    },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
    },
  },
  { timestamps: true }, // This automatically adds createdAt and updatedAt
);

// 3. Export the Model
export default mongoose.model<ICourse>("Course", CourseSchema);
