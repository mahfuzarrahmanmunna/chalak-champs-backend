"use strict";
// // src/models/Lesson.ts
// import mongoose, { Document, Schema } from "mongoose";
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
// export interface ILesson extends Document {
//   title: string;
//   titleBn?: string;
//   description?: string;
//   descriptionBn?: string;
//   content?: string;
//   videoUrl?: string;
//   duration?: number;
//   order: number;
//   isPublished: boolean;
//   isFree: boolean;
//   courseId: mongoose.Types.ObjectId;
//   resources: IResource[];
//   createdAt: Date;
//   updatedAt: Date;
// }
// export interface IResource {
//   title: string;
//   type: "pdf" | "video" | "link" | "document";
//   url: string;
//   size?: number;
// }
// const ResourceSchema = new Schema(
//   {
//     title: { type: String, required: true },
//     type: {
//       type: String,
//       required: true,
//       enum: ["pdf", "video", "link", "document"],
//     },
//     url: { type: String, required: true },
//     size: { type: Number },
//   },
//   { _id: false },
// );
// const LessonSchema: Schema = new Schema(
//   {
//     title: {
//       type: String,
//       required: [true, "Lesson title is required"],
//       trim: true,
//     },
//     titleBn: {
//       type: String,
//       trim: true,
//     },
//     description: {
//       type: String,
//       trim: true,
//     },
//     descriptionBn: {
//       type: String,
//       trim: true,
//     },
//     content: {
//       type: String,
//     },
//     videoUrl: {
//       type: String,
//     },
//     duration: {
//       type: Number,
//       min: 0,
//     },
//     order: {
//       type: Number,
//       required: true,
//     },
//     isPublished: {
//       type: Boolean,
//       default: false,
//     },
//     isFree: {
//       type: Boolean,
//       default: false,
//     },
//     courseId: {
//       type: Schema.Types.ObjectId,
//       ref: "Course",
//       required: true,
//     },
//     resources: [ResourceSchema],
//   },
//   {
//     timestamps: true,
//   },
// );
// export default mongoose.model<ILesson>("Lesson", LessonSchema);
const mongoose_1 = __importStar(require("mongoose"));
const LessonSchema = new mongoose_1.Schema({
    module: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Module",
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    videoUrl: {
        type: String,
    },
    // This stores the Editor.js blocks object
    content: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true,
        default: { blocks: [] },
    },
    order: {
        type: Number,
        required: true,
    },
    duration: {
        type: Number, // in minutes
        default: 0,
    },
    resources: [
        {
            type: String, // Cloudinary URLs
        },
    ],
    quiz: [
        {
            questionText: { type: String, required: true },
            options: [{ type: String, required: true }],
            correctAnswer: { type: Number, required: true },
            points: { type: Number, default: 1 },
        },
    ],
    isFreePreview: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });
// Index for fetching lessons of a module quickly
LessonSchema.index({ module: 1, order: 1 });
const Lesson = mongoose_1.default.model("Lesson", LessonSchema);
exports.default = Lesson;
