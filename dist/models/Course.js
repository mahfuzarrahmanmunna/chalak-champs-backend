"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
// --- HELPERS ---
const sanitizeBilingual = (val) => {
    if (!val)
        return { en: "", bn: "" };
    if (typeof val === "string")
        return { en: val, bn: val };
    if (typeof val === "object" && val !== null) {
        return {
            en: typeof val.en === "string" ? val.en : String(val.en || ""),
            bn: typeof val.bn === "string" ? val.bn : String(val.bn || ""),
        };
    }
    return { en: "", bn: "" };
};
// --- Reusable Bilingual Schema ---
const BilingualSchema = new mongoose_1.Schema({
    en: { type: String, default: "" },
    bn: { type: String, default: "" },
}, { _id: false });
const CourseSchema = new mongoose_1.Schema({
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
    instructor: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    instructorName: { type: String },
    duration: { type: BilingualSchema, default: { en: "", bn: "" } },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    thumbnail: { type: String },
    thumbnailDeleteUrl: { type: String },
    videoUrl: { type: String },
    videoDeleteUrl: { type: String },
    quickInfo: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    offerDetails: { type: String },
    courseOverview: { type: String },
    levels: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    features: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    faqs: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    category: { type: String, default: "general" },
    level: { type: String },
    content: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
}, { timestamps: true });
CourseSchema.pre("save", { document: true, query: false }, async function () {
    this.title = sanitizeBilingual(this.title);
    this.heroSubtitle = sanitizeBilingual(this.heroSubtitle);
    this.description = sanitizeBilingual(this.description);
    this.duration = sanitizeBilingual(this.duration);
    if (this.isModified("title") && !this.slug) {
        const titleEn = this.title.en || "";
        this.slug = titleEn
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    }
    if (this.isPublished && !this.publishedAt) {
        this.publishedAt = new Date();
    }
});
exports.default = mongoose_1.default.model("Course", CourseSchema);
