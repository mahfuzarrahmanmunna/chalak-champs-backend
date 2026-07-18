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
// src/models/CtaBooking.ts
const mongoose_1 = __importStar(require("mongoose"));
const CtaBookingSchema = new mongoose_1.Schema({
    studentName: {
        type: String,
        required: [true, "Student name is required"],
        trim: true,
    },
    fatherName: {
        type: String,
        required: [true, "Father name is required"],
        trim: true,
    },
    phone: {
        type: String,
        required: [true, "Phone number is required"],
        trim: true,
    },
    countryCode: {
        type: String,
        required: [true, "Country code is required"],
        trim: true,
    },
    fullPhone: {
        type: String,
        required: [true, "Full phone number is required"],
        trim: true,
    },
    studentClass: {
        type: String,
        required: [true, "Class is required"],
        trim: true,
    },
    countryName: {
        type: String,
        default: "",
        trim: true,
    },
    countryFlag: {
        type: String,
        default: "",
        trim: true,
    },
    countryCca2: {
        type: String,
        default: "",
        trim: true,
    },
}, {
    timestamps: true,
});
// Index for faster queries
CtaBookingSchema.index({ createdAt: -1 });
exports.default = mongoose_1.default.models.CtaBooking ||
    mongoose_1.default.model("CtaBooking", CtaBookingSchema);
