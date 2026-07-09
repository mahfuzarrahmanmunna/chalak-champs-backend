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
// --- Reusable Bilingual Schema ---
const BilingualSchema = new mongoose_1.Schema({
    en: { type: String, default: "" },
    bn: { type: String, default: "" },
}, { _id: false });
const CourseSchema = new mongoose_1.Schema({
    // ✅ UPDATED: Now accepts { en: "", bn: "" }
    title: { type: BilingualSchema, required: true },
    // ✅ UPDATED: Now accepts { en: "", bn: "" } (Made optional to prevent errors on empty forms)
    heroSubtitle: { type: BilingualSchema },
    // Already bilingual, no changes needed
    description: { type: BilingualSchema, default: { en: "", bn: "" } },
    instructor: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    instructorName: { type: String },
    duration: { type: String },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    thumbnail: { type: String },
    thumbnailDeleteUrl: { type: String },
    videoUrl: { type: String },
    videoDeleteUrl: { type: String },
    // Accept flexible structured quickInfo (object with bilingual title, items, etc.)
    quickInfo: { type: mongoose_1.Schema.Types.Mixed, default: [] },
    offerDetails: { type: String },
    courseOverview: { type: String },
    // ✅ UPDATED: Nested fields now use BilingualSchema
    // Accept flexible levels structure from frontend (may contain level1/level2 nested objects)
    levels: { type: mongoose_1.Schema.Types.Mixed, default: [] },
    // ✅ UPDATED: Nested fields now use BilingualSchema
    features: { type: mongoose_1.Schema.Types.Mixed, default: [] },
    // ✅ Kept as simple strings because your frontend strips the bn object for FAQs
    faqs: { type: mongoose_1.Schema.Types.Mixed, default: [] },
    category: { type: String },
    // ✅ FIXED: Changed to lowercase to match frontend select values
    // Keep level as open string to accept a wider set of frontend values
    level: { type: String },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Course", CourseSchema);
