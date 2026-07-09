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
// src/models/Order.ts
const mongoose_1 = __importStar(require("mongoose"));
const OrderSchema = new mongoose_1.Schema({
    orderId: { type: String, required: true, unique: true },
    tranId: { type: String, required: true, unique: true }, // unique: true already creates an index
    courseId: { type: String, required: true },
    courseTitle: { type: String, required: true },
    courseImage: { type: String },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, default: "" },
    userPhone: { type: String, default: "" },
    addons: { type: [Number], default: [] },
    paymentMethod: { type: String, required: true },
    paymentPlan: { type: String, enum: ["full", "monthly"], default: "full" },
    promoCode: { type: String, default: null },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: "BDT" },
    status: {
        type: String,
        enum: ["pending", "processing", "paid", "failed", "cancelled", "expired"],
        default: "pending",
    },
    gatewayResponse: { type: mongoose_1.Schema.Types.Mixed, default: null },
    verifiedAt: { type: Date },
}, { timestamps: true });
// Only index fields that DON'T already have unique: true
OrderSchema.index({ userId: 1 });
OrderSchema.index({ courseId: 1 });
OrderSchema.index({ status: 1 });
exports.default = mongoose_1.default.model("Order", OrderSchema);
