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
// src/models/Lesson.ts
const mongoose_1 = __importStar(require("mongoose"));
const ResourceSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    type: {
        type: String,
        required: true,
        enum: ["pdf", "video", "link", "document"],
    },
    url: { type: String, required: true },
    size: { type: Number },
}, { _id: false });
const LessonSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: [true, "Lesson title is required"],
        trim: true,
    },
    titleBn: {
        type: String,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    descriptionBn: {
        type: String,
        trim: true,
    },
    content: {
        type: String,
    },
    videoUrl: {
        type: String,
    },
    duration: {
        type: Number,
        min: 0,
    },
    order: {
        type: Number,
        required: true,
    },
    isPublished: {
        type: Boolean,
        default: false,
    },
    isFree: {
        type: Boolean,
        default: false,
    },
    courseId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
    },
    resources: [ResourceSchema],
}, {
    timestamps: true,
});
exports.default = mongoose_1.default.model("Lesson", LessonSchema);
