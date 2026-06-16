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
const CourseSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    heroSubtitle: { type: String, required: true },
    description: {
        en: { type: String, default: "" },
        bn: { type: String, default: "" },
    },
    instructor: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    instructorName: { type: String }, // <--- ADDED THIS
    duration: { type: String }, // <--- ADDED THIS
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    thumbnail: { type: String },
    thumbnailDeleteUrl: { type: String },
    videoUrl: { type: String },
    videoDeleteUrl: { type: String },
    quickInfo: { type: [String], default: [] },
    offerDetails: { type: String },
    courseOverview: { type: String },
    levels: [
        {
            title: String,
            description: String,
            targetAudience: String,
            topics: [String],
        },
    ],
    features: [
        {
            title: String,
            description: {
                en: { type: String, default: "" },
                bn: { type: String, default: "" },
            },
        },
    ],
    faqs: [
        {
            question: String,
            answer: String,
        },
    ],
    category: { type: String },
    level: {
        type: String,
        enum: ["Beginner", "Intermediate", "Advanced"],
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Course", CourseSchema);
