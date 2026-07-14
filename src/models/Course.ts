import mongoose, { Document, Schema } from "mongoose";

// --- Reusable Bilingual Schema ---
const BilingualSchema = new Schema(
  {
    en: { type: String, default: "" },
    bn: { type: String, default: "" },
  },
  { _id: false }
);

// --- Interfaces ---
export interface IBilingualText {
  en: string;
  bn: string;
}

export interface ILevel {
  title: IBilingualText;
  description: IBilingualText;
  target: IBilingualText;
  topics: string[];
}

export interface IFeature {
  title: IBilingualText;
  desc: IBilingualText;
}

export interface IFaq {
  question: string;
  answer: string;
}

// ✅ NEW: Full Content Interface matching your JSON structure
export interface ICourseContent {
  breadcrumb?: IBilingualText;
  hero?: {
    title: IBilingualText;
    subtitle: IBilingualText;
  };
  quickInfo?: {
    title: IBilingualText;
    items: { en: string[]; bn: string[] };
    offerPrice: IBilingualText;
    offerText: IBilingualText;
    cta1: IBilingualText;
    cta2: IBilingualText;
    ctaBelow: IBilingualText;
  };
  overview?: {
    title: IBilingualText;
    content: IBilingualText;
  };
  levels?: {
    title: IBilingualText;
    intro: IBilingualText;
    level1: {
      title: IBilingualText;
      for: IBilingualText;
      intro: IBilingualText;
      items: { en: string[]; bn: string[] };
    };
    level2: {
      title: IBilingualText;
      for: IBilingualText;
      intro: IBilingualText;
      items: { en: string[]; bn: string[] };
    };
  };
  whoIsThisFor?: {
    title: IBilingualText;
    intro: IBilingualText;
    items: { en: string[]; bn: string[] };
    boldStatement: IBilingualText;
  };
  features?: {
    title: IBilingualText;
    cards: { title: IBilingualText; body: IBilingualText }[];
  };
  syllabus?: {
    title: IBilingualText;
    content: IBilingualText;
  };
  finalCta?: {
    title: IBilingualText;
    body: IBilingualText;
    cta1: IBilingualText;
    cta2: IBilingualText;
    cta3: IBilingualText;
    ctaBelow: IBilingualText;
  };
  payment?: {
    title: IBilingualText;
    description: IBilingualText;
  };
  instructor?: {
    title: IBilingualText;
    name: string;
    designation: IBilingualText;
    bio: IBilingualText;
    experience: IBilingualText;
    studentsCount: number;
    rating: number;
    specializations: { en: string[]; bn: string[] };
    achievements: { en: string[]; bn: string[] };
    education: IBilingualText;
    image: string;
    social: {
      facebook?: string;
      linkedin?: string;
      youtube?: string;
    };
  };
  review?: {
    title: IBilingualText;
  };
  faq?: {
    title: IBilingualText;
    items: { q: IBilingualText; a: IBilingualText }[];
  };
  mediaAssets?: {
    type: "image" | "video";
    src: string;
    poster?: string;
    isNew?: boolean;
    tempIndex?: number;
  }[];
}

// ✅ UPDATED: Main Course Interface with `content` added
export interface ICourse extends Document {
  _id: mongoose.Types.ObjectId;
  slug?: string;
  title: IBilingualText;
  heroSubtitle?: IBilingualText;
  description: IBilingualText;
  instructor: mongoose.Types.ObjectId;
  instructorName?: string;
  duration?: IBilingualText; // Changed from string to IBilingualText
  price: number;
  originalPrice?: number;
  thumbnail?: string;
  thumbnailDeleteUrl?: string;
  videoUrl?: string;
  videoDeleteUrl?: string;
  quickInfo: any;
  offerDetails?: string;
  courseOverview?: string;
  levels: any;
  features: any;
  faqs: any;
  category?: string;
  level?: string;
  
  // ✅ ADDED THIS: The full bilingual content structure
  content?: ICourseContent;
  
  isPublished: boolean;
  publishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const CourseSchema: Schema = new Schema(
  {
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    title: { type: BilingualSchema, required: true },
    heroSubtitle: { type: BilingualSchema },
    description: { type: BilingualSchema, default: { en: "", bn: "" } },

    instructor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    instructorName: { type: String },
    duration: { type: BilingualSchema, default: { en: "", bn: "" } }, // Changed to BilingualSchema
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    thumbnail: { type: String },
    thumbnailDeleteUrl: { type: String },
    videoUrl: { type: String },
    videoDeleteUrl: { type: String },
    
    quickInfo: { type: Schema.Types.Mixed, default: {} },
    offerDetails: { type: String },
    courseOverview: { type: String },
    levels: { type: Schema.Types.Mixed, default: {} },
    features: { type: Schema.Types.Mixed, default: {} },
    faqs: { type: Schema.Types.Mixed, default: {} },

    category: { type: String, default: "general" },
    level: { type: String },

    // ✅ ADDED THIS: Schema definition for content
    // Using Mixed type because the structure is very deep and complex
    content: { type: Schema.Types.Mixed, default: {} },

    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

// Generate slug from title before saving
CourseSchema.pre("save", { document: true, query: false }, function (next: Function) {
  if (this.isModified("title") && !this.slug) {
    const titleEn = (this.title as any).en || "";
    this.slug = titleEn
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  if (this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

export default mongoose.model<ICourse>("Course", CourseSchema);