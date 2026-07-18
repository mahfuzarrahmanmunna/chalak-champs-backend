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
const ProctorFlagSchema = new mongoose_1.Schema({
    timestamp: { type: Date, default: Date.now },
    type: String,
    riskLevel: { type: String, enum: ["low", "medium", "high"] },
    message: String,
});
const SubmissionSchema = new mongoose_1.Schema({
    exam: { type: mongoose_1.Schema.Types.ObjectId, ref: "Exam", required: true },
    student: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    answers: [
        {
            questionId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Question" },
            answer: mongoose_1.Schema.Types.Mixed,
        },
    ],
    score: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ["in-progress", "submitted", "graded", "flagged"],
        default: "in-progress",
    },
    gradingStatus: {
        type: String,
        enum: ["pending_review", "graded"],
    },
    reviewerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    reviewerFeedback: {
        en: { type: String, default: "" },
        bn: { type: String, default: "" },
    },
    reviewedAt: { type: Date },
    proctorFlags: [ProctorFlagSchema],
    riskScore: { type: Number, default: 0 },
    startTime: { type: Date, default: Date.now },
    endTime: Date,
}, { timestamps: true });
exports.default = mongoose_1.default.model("Submission", SubmissionSchema);
