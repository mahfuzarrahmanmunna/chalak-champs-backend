"use strict";
// src/models/Lesson.ts
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
const LessonSchema = new mongoose_1.Schema({
    module: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Module",
        required: true,
        index: true,
    },
    title: {
        en: { type: String, required: true, default: "" },
        bn: { type: String, default: "" },
    },
    type: {
        type: String,
        enum: ["video", "pdf", "exam", "capstone", "article"],
        default: "video",
        required: true,
    },
    videoUrl: { type: String },
    content: { type: String },
    order: { type: Number, required: true, default: 0 },
    duration: { type: Number, default: 0 },
    isFreePreview: { type: Boolean, default: false },
    resources: [{ type: mongoose_1.Schema.Types.Mixed }],
    quiz: [{ type: mongoose_1.Schema.Types.Mixed }],
    // ✅ NEW: Exam integration fields
    examId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Exam",
        default: null,
    },
    examConfig: {
        duration: { type: Number, default: 60 },
        passingMarks: { type: Number, default: 50 },
        negativeMarking: { type: Number, default: 0 },
        isProctored: { type: Boolean, default: true },
        totalQuestions: { type: Number, default: 0 },
        totalMarks: { type: Number, default: 0 },
    },
}, { timestamps: true });
// Index for querying lessons by exam
LessonSchema.index({ examId: 1 });
exports.default = mongoose_1.default.model("Lesson", LessonSchema);
