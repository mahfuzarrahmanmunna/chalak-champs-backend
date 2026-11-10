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
const AdmissionSchema = new mongoose_1.Schema({
    applicationNumber: { type: String, required: true, unique: true, index: true },
    student: {
        fullName: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, lowercase: true },
        phone: { type: String, required: true, trim: true },
        dateOfBirth: Date,
        gender: { type: String, trim: true },
        presentAddress: { type: String, trim: true },
        permanentAddress: { type: String, trim: true },
    },
    guardian: {
        fullName: { type: String, required: true, trim: true },
        relationship: { type: String, trim: true },
        phone: { type: String, required: true, trim: true },
        email: { type: String, trim: true, lowercase: true },
    },
    education: {
        qualification: { type: String, trim: true },
        institution: { type: String, trim: true },
        passingYear: Number,
        details: { type: String, trim: true },
    },
    course: { type: mongoose_1.Schema.Types.ObjectId, ref: "Course", required: true },
    courseTitle: { type: String, required: true, trim: true },
    preferredBatch: { type: String, trim: true },
    motivation: { type: String, trim: true },
    previousExperience: { type: String, trim: true },
    status: {
        type: String,
        enum: [
            "Submitted",
            "Under Review",
            "Additional Information Required",
            "Approved",
            "Rejected",
            "Enrolled",
        ],
        default: "Submitted",
        required: true,
    },
    statusHistory: [
        {
            status: { type: String, required: true },
            changedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
            changedAt: { type: Date, required: true, default: Date.now },
            _id: false,
        },
    ],
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Admission", AdmissionSchema);
