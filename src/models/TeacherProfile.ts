import mongoose, { Schema, Document, Model } from "mongoose";
import { generateUniqueSlug } from "../utils/slugify";

// ─────────────────────────────────────────────────────────────
//  Subdocument schemas
// ─────────────────────────────────────────────────────────────

const EducationSchema = new Schema(
  {
    degree: { type: String, required: true, trim: true, maxlength: 120 },
    institution: { type: String, required: true, trim: true, maxlength: 160 },
    fieldOfStudy: { type: String, trim: true, maxlength: 120 },
    completionYear: {
      type: Number,
      validate: {
        validator: function (v: number | null | undefined) {
          if (v === null || v === undefined || v === 0) return true;
          const year = new Date().getFullYear();
          return v >= 1900 && v <= year + 5;
        },
        message: (props: any) =>
          `Completion year must be between 1900 and ${new Date().getFullYear() + 5}, got ${props.value}`,
      },
    },
    certificateTitle: { type: String, trim: true, maxlength: 160 },
    certificateUrl: { type: String, trim: true, maxlength: 2048 },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
  },
  { _id: true },
);

const ExperienceSchema = new Schema(
  {
    institution: { type: String, required: true, trim: true, maxlength: 160 },
    position: { type: String, required: true, trim: true, maxlength: 120 },
    subject: { type: String, trim: true, maxlength: 120 },
    startDate: {
      type: Date,
      required: function (this: any) {
        // Only require startDate if not currently employed (endDate is set OR isCurrent is false)
        return !this.isCurrent;
      },
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (v: Date | null) {
          // @ts-ignore — `this` is the subdoc
          return !v || !this.startDate || v >= this.startDate;
        },
        message: "End date must be on or after start date",
      },
    },
    isCurrent: { type: Boolean, default: false },
    description: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: true },
);

const PortfolioItemSchema = new Schema(
  {
    kind: {
      type: String,
      enum: ["introVideo", "demoVideo", "image", "studentWork", "awardImage"],
      required: true,
    },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    caption: { type: String, trim: true, maxlength: 200 },
  },
  { _id: true },
);

const AvailabilitySlotSchema = new Schema(
  {
    weekday: {
      type: String,
      enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      required: true,
    },
    start: { type: String, required: true }, // "HH:mm"
    end: { type: String, required: true },   // "HH:mm"
  },
  { _id: true },
);

// ─────────────────────────────────────────────────────────────
//  Main schema
// ─────────────────────────────────────────────────────────────

export interface ITeacherProfile extends Document {
  user: mongoose.Types.ObjectId;
  displayName: string;
  profilePhotoUrl: string;
  professionalTitle: string;
  shortIntro: string;
  biography: string;
  slug: string;
  languagesSpoken: string[];

  subjects: string[];
  expertiseAreas: string[];
  teachingMethods: string[];
  skillsStudentsLearn: string[];
  ageGroups: string[];
  gradeLevels: string[];
  levels: string[];

  education: any[];
  experience: any[];
  totalYearsExperience: number;
  achievements: string[];
  awards: string[];
  childFocusedExperience: string;

  teachingPhilosophy: string;
  teachingApproach: string;
  whyTeachChildren: string;
  classFormat: "live" | "recorded" | "both";
  preferredLanguages: string[];

  portfolio: any[];

  availability: {
    slots: any[];
    timezone: string;
    classDurations: number[];
    formats: string[];
  };

  verificationStatus: "pending" | "verified" | "rejected";
  approvalStatus: "pending" | "approved" | "rejected";
  approvalNote: string;
  isPublished: boolean;
  isActive: boolean;

  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const TeacherProfileSchema = new Schema<ITeacherProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    displayName: { type: String, required: true, trim: true, maxlength: 120 },
    profilePhotoUrl: { type: String, default: "", trim: true, maxlength: 2048 },
    professionalTitle: { type: String, required: true, trim: true, maxlength: 160 },
    shortIntro: { type: String, default: "", trim: true, maxlength: 280 },
    biography: { type: String, default: "", trim: true, maxlength: 4000 },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    languagesSpoken: [{ type: String, trim: true, maxlength: 60 }],

    subjects: [{ type: String, trim: true, maxlength: 60 }],
    expertiseAreas: [{ type: String, trim: true, maxlength: 80 }],
    teachingMethods: [{ type: String, trim: true, maxlength: 80 }],
    skillsStudentsLearn: [{ type: String, trim: true, maxlength: 80 }],
    ageGroups: [{ type: String, trim: true, maxlength: 40 }],
    gradeLevels: [{ type: String, trim: true, maxlength: 40 }],
    levels: [{ type: String, enum: ["beginner", "intermediate", "advanced"] }],

    education: [EducationSchema],
    experience: [ExperienceSchema],
    totalYearsExperience: { type: Number, default: 0, min: 0, max: 80 },
    achievements: [{ type: String, trim: true, maxlength: 200 }],
    awards: [{ type: String, trim: true, maxlength: 200 }],
    childFocusedExperience: { type: String, default: "", trim: true, maxlength: 1500 },

    teachingPhilosophy: { type: String, default: "", trim: true, maxlength: 2000 },
    teachingApproach: { type: String, default: "", trim: true, maxlength: 2000 },
    whyTeachChildren: { type: String, default: "", trim: true, maxlength: 1000 },
    classFormat: {
      type: String,
      enum: ["live", "recorded", "both"],
      default: "live",
    },
    preferredLanguages: [{ type: String, trim: true, maxlength: 60 }],

    portfolio: [PortfolioItemSchema],

    availability: {
      slots: [AvailabilitySlotSchema],
      timezone: { type: String, default: "Asia/Dhaka", trim: true, maxlength: 60 },
      classDurations: [{ type: Number, min: 15, max: 240 }],
      formats: [{ type: String, trim: true, maxlength: 40 }],
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    approvalNote: { type: String, default: "", trim: true, maxlength: 500 },
    isPublished: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

// Pre-validate: ensure slug exists & is unique
TeacherProfileSchema.pre("validate", async function () {
  const doc = this as ITeacherProfile;
  if (doc.isModified("slug") || !doc.slug) {
    if (!doc.slug) doc.slug = doc.displayName || "teacher";
    doc.slug = await generateUniqueSlug(doc.slug, doc._id);
  }
});

// ─────────────────────────────────────────────────────────────
//  Indexes
//  NOTE: MongoDB cannot create a compound index that includes TWO OR MORE
//  array fields (a.k.a. "parallel arrays"). So we split the previous
//  compound index into one base index (non-array fields) + separate
//  multikey indexes for each array field individually.
// ─────────────────────────────────────────────────────────────

// Compound index for the public listing base filter (non-array fields only)
TeacherProfileSchema.index(
  { approvalStatus: 1, isPublished: 1, isActive: 1 },
  { name: "teacher_public_listing_base" },
);

// Separate multikey indexes for array fields (each is allowed individually)
TeacherProfileSchema.index({ subjects: 1 }, { name: "teacher_subjects_idx" });
TeacherProfileSchema.index({ ageGroups: 1 }, { name: "teacher_agegroups_idx" });
TeacherProfileSchema.index({ gradeLevels: 1 }, { name: "teacher_gradelevels_idx" });
TeacherProfileSchema.index({ languagesSpoken: 1 }, { name: "teacher_languages_idx" });

// Prevent model re-compilation in dev hot reloads
const TeacherProfile: Model<ITeacherProfile> =
  (mongoose.models.TeacherProfile as Model<ITeacherProfile>) ||
  mongoose.model<ITeacherProfile>("TeacherProfile", TeacherProfileSchema);

export default TeacherProfile;