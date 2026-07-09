// backend/src/models/FeatureCoursesBanner.ts

import mongoose, { Schema, Document } from "mongoose";

export interface IFeatureCoursesBanner extends Document {
  lang: "en" | "bn";
  image: string; // R2 Public URL
  key: string; // R2 Object Key (used for deletion)
  link: string;
  altText: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FeatureCoursesBannerSchema = new Schema<IFeatureCoursesBanner>(
  {
    lang: {
      type: String,
      enum: ["en", "bn"],
      required: [true, "Language is required"],
    },
    image: {
      type: String,
      required: [true, "Image is required"],
      trim: true,
    },
    key: {
      type: String,
      required: [true, "Image key is required"],
      trim: true,
    },
    link: {
      type: String,
      required: [true, "Link is required"],
      trim: true,
    },
    altText: {
      type: String,
      default: "Featured courses banner",
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

FeatureCoursesBannerSchema.index({ lang: 1, active: -1 });

export default mongoose.model<IFeatureCoursesBanner>(
  "FeatureCoursesBanner",
  FeatureCoursesBannerSchema,
);
