import mongoose, { Document, Schema } from "mongoose";

// --- SUB-INTERFACES ---

export interface IProductFeature {
  title: { en: string; bn: string };
  desc: { en: string; bn: string };
  icon: string;
}

export interface IProductSpec {
  label: { en: string; bn: string };
  value: { en: string; bn: string };
}

export interface IBilingualValue {
  en: string;
  bn: string;
}

// --- MAIN INTERFACE ---

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;

  // Core
  title: IBilingualValue;
  slug: string;
  category: "book" | "apparel" | "bags" | "stationary";
  subtitle: IBilingualValue;
  description: IBilingualValue;
  secondaryDescription: IBilingualValue;
  fee: number;
  originalFee?: number;
  badge?: string;
  isPublished: boolean;
  sortOrder: number;

  // Rich arrays
  highlights: IBilingualValue[];
  features: IProductFeature[];
  whyPoints: IBilingualValue[];
  specs: IProductSpec[];

  // Book specific
  author?: IBilingualValue;
  pages?: string;
  publisher?: IBilingualValue;
  edition?: IBilingualValue;
  country?: IBilingualValue;
  language?: IBilingualValue;

  // Bag specific
  bagMaterial?: IBilingualValue;
  bagCapacity?: string;
  bagDimensions?: string;
  bagCompartments?: number;

  // Apparel specific
  apparelMaterial?: IBilingualValue;
  apparelFit?: IBilingualValue;
  apparelSizes?: string;
  apparelColors?: string;

  // Stationary specific
  stationaryType?: IBilingualValue;
  stationaryColor?: string;
  stationaryPackSize?: string;
  stationaryMaterial?: IBilingualValue;

  // Image
  image?: string;
  imageKey?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

// --- HELPER: bilingual sub-schema ---

const bilingualSchema = new Schema<IBilingualValue>(
  {
    en: { type: String, default: "" },
    bn: { type: String, default: "" },
  },
  { _id: false },
);

// --- MAIN SCHEMA ---

const ProductSchema: Schema<IProduct> = new Schema(
  {
    // Core
    title: { type: bilingualSchema, required: true },
    slug: {
      type: String,
      required: true, // ✅ CHANGED: required instead of sparse
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["book", "apparel", "bags", "stationary"],
    },
    subtitle: { type: bilingualSchema, default: () => ({ en: "", bn: "" }) },
    description: {
      type: bilingualSchema,
      default: () => ({ en: "", bn: "" }),
    },
    secondaryDescription: {
      type: bilingualSchema,
      default: () => ({ en: "", bn: "" }),
    },
    fee: { type: Number, required: true },
    originalFee: { type: Number },
    badge: { type: String },
    isPublished: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },

    // Rich arrays
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
        icon: { type: String, default: "" },
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

    // Book specific
    author: { type: bilingualSchema },
    pages: { type: String },
    publisher: { type: bilingualSchema },
    edition: { type: bilingualSchema },
    country: { type: bilingualSchema },
    language: { type: bilingualSchema },

    // Bag specific
    bagMaterial: { type: bilingualSchema },
    bagCapacity: { type: String },
    bagDimensions: { type: String },
    bagCompartments: { type: Number },

    // Apparel specific
    apparelMaterial: { type: bilingualSchema },
    apparelFit: { type: bilingualSchema },
    apparelSizes: { type: String },
    apparelColors: { type: String },

    // Stationary specific
    stationaryType: { type: bilingualSchema },
    stationaryColor: { type: String },
    stationaryPackSize: { type: String },
    stationaryMaterial: { type: bilingualSchema },

    // Image
    image: { type: String },
    imageKey: { type: String },
  },
  { timestamps: true, strict: false },
);

// ❌ REMOVED: pre("save") hook — it was causing slug to be silently dropped
// All slug logic is now handled in the controller only

export default mongoose.model<IProduct>("Product", ProductSchema);
