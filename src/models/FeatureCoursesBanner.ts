import mongoose, { Schema, Types } from "mongoose";

// 1. REMOVE "extends Document"
// 2. ADD "_id" and "__v" manually since you are using .lean() in your controller
export interface IFeatureCoursesBanner {
  _id: Types.ObjectId;
  lang: "en" | "bn";
  image: string;
  key: string;
  link: string;
  altText: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
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
