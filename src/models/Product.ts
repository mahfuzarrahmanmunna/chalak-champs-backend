// src/models/Product.ts

import mongoose, { Document, Schema } from "mongoose";

export interface IProductFeature {
  title: {
    en: string;
    bn: string;
  };
  desc: {
    en: string;
    bn: string;
  };
  icon: string;
}

export interface IProductSpec {
  label: {
    en: string;
    bn: string;
  };
  value: {
    en: string;
    bn: string;
  };
}

export interface IBilingualValue {
  en: string;
  bn: string;
}

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  category: string;
  subtitle: string;
  description: {
    en: string;
    bn: string;
  };
  secondaryDescription: {
    en: string;
    bn: string;
  };
  fee: number;
  originalFee?: number;
  badge?: string;
  highlights: IBilingualValue[]; // ✅ FIXED: was [String]
  features: IProductFeature[]; // ✅ FIXED: title/desc now bilingual
  whyPoints: IBilingualValue[]; // ✅ FIXED: was [String]
  specs: IProductSpec[]; // ✅ FIXED: label/value now bilingual
  author?: string;
  pages?: string;
  publisher?: string;
  edition?: string;
  country?: string;
  language?: string;
  image?: string;
  imageDeleteUrl?: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProductSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ["book", "apparel", "bags", "stationary"],
    },
    subtitle: { type: String, default: "" },
    description: {
      en: { type: String, default: "" },
      bn: { type: String, default: "" },
    },
    secondaryDescription: {
      en: { type: String, default: "" },
      bn: { type: String, default: "" },
    },
    fee: { type: Number, required: true },
    originalFee: { type: Number },
    badge: { type: String },
    highlights: [
      {
        en: { type: String, default: "" },
        bn: { type: String, default: "" },
      },
    ],
    features: [
      {
        title: {
          en: { type: String, default: "" },
          bn: { type: String, default: "" },
        },
        desc: {
          en: { type: String, default: "" },
          bn: { type: String, default: "" },
        },
        icon: { type: String },
      },
    ],
    whyPoints: [
      {
        en: { type: String, default: "" },
        bn: { type: String, default: "" },
      },
    ],
    specs: [
      {
        label: {
          en: { type: String, default: "" },
          bn: { type: String, default: "" },
        },
        value: {
          en: { type: String, default: "" },
          bn: { type: String, default: "" },
        },
      },
    ],
    author: { type: String },
    pages: { type: String },
    publisher: { type: String },
    edition: { type: String },
    country: { type: String },
    language: { type: String },
    image: { type: String },
    imageDeleteUrl: { type: String },
    isPublished: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model<IProduct>("Product", ProductSchema);
