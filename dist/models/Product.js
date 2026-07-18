"use strict";
// src/models/Product.ts
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
const ProductSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    category: {
        type: String,
        required: true,
        enum: ["book", "apparel", "bags", "stationary"],
    },
    subtitle: { type: String, default: "" },
    description: {
        en: { type: String, default: "" },
        bn: { type: String, default: "" },
    },
    secondaryDescription: {
        en: { type: String, default: "" },
        bn: { type: String, default: "" },
    },
    fee: { type: Number, required: true },
    originalFee: { type: Number },
    badge: { type: String },
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
            icon: { type: String },
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
    author: { type: String },
    pages: { type: String },
    publisher: { type: String },
    edition: { type: String },
    country: { type: String },
    language: { type: String },
    image: { type: String },
    imageDeleteUrl: { type: String },
    isPublished: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Product", ProductSchema);
