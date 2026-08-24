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
// --- HELPER: bilingual sub-schema ---
const bilingualSchema = new mongoose_1.Schema({
    en: { type: String, default: "" },
    bn: { type: String, default: "" },
}, { _id: false });
// --- MAIN SCHEMA ---
const ProductSchema = new mongoose_1.Schema({
    // Core
    title: { type: bilingualSchema, required: true },
    slug: {
        type: String,
        required: true, // ✅ CHANGED: required instead of sparse
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    category: {
        type: String,
        required: true,
        enum: ["book", "apparel", "bags", "stationary"],
    },
    subtitle: { type: bilingualSchema, default: () => ({ en: "", bn: "" }) },
    description: {
        type: bilingualSchema,
        default: () => ({ en: "", bn: "" }),
    },
    secondaryDescription: {
        type: bilingualSchema,
        default: () => ({ en: "", bn: "" }),
    },
    fee: { type: Number, required: true },
    originalFee: { type: Number },
    badge: { type: String },
    isPublished: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    // Rich arrays
    highlights: [
        {
            en: { type: String, default: "" },
            bn: { type: String, default: "" },
        },
    ],
    features: [
        {
            title: {
                en: { type: String, default: "" },
                bn: { type: String, default: "" },
            },
            desc: {
                en: { type: String, default: "" },
                bn: { type: String, default: "" },
            },
            icon: { type: String, default: "" },
        },
    ],
    whyPoints: [
        {
            en: { type: String, default: "" },
            bn: { type: String, default: "" },
        },
    ],
    specs: [
        {
            label: {
                en: { type: String, default: "" },
                bn: { type: String, default: "" },
            },
            value: {
                en: { type: String, default: "" },
                bn: { type: String, default: "" },
            },
        },
    ],
    // Book specific
    author: { type: bilingualSchema },
    pages: { type: String },
    publisher: { type: bilingualSchema },
    edition: { type: bilingualSchema },
    country: { type: bilingualSchema },
    language: { type: bilingualSchema },
    // Bag specific
    bagMaterial: { type: bilingualSchema },
    bagCapacity: { type: String },
    bagDimensions: { type: String },
    bagCompartments: { type: Number },
    // Apparel specific
    apparelMaterial: { type: bilingualSchema },
    apparelFit: { type: bilingualSchema },
    apparelSizes: { type: String },
    apparelColors: { type: String },
    // Stationary specific
    stationaryType: { type: bilingualSchema },
    stationaryColor: { type: String },
    stationaryPackSize: { type: String },
    stationaryMaterial: { type: bilingualSchema },
    // Image
    image: { type: String },
    imageKey: { type: String },
}, { timestamps: true, strict: false });
// ❌ REMOVED: pre("save") hook — it was causing slug to be silently dropped
// All slug logic is now handled in the controller only
exports.default = mongoose_1.default.model("Product", ProductSchema);
