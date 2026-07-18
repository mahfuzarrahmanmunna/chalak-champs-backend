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
// --- Helpers ---
const generatePurchaseId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PUR-${timestamp}-${random}`;
};
// --- Schema ---
const PurchaseSchema = new mongoose_1.Schema({
    purchaseId: {
        type: String,
        unique: true,
        index: true,
        default: generatePurchaseId,
    },
    studentName: {
        type: String,
        required: [true, "Student name is required"],
        trim: true,
        maxlength: [100, "Name cannot exceed 100 characters"],
    },
    studentPhone: {
        type: String,
        required: [true, "Phone number is required"],
        trim: true,
        validate: {
            validator: function (v) {
                return /^01[3-9]\d{8}$/.test(v);
            },
            message: "Please enter a valid Bangladeshi phone number (01XXXXXXXXX)",
        },
    },
    studentEmail: {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
            validator: function (v) {
                if (!v)
                    return true;
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: "Please enter a valid email address",
        },
    },
    items: [
        {
            courseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Course", required: true },
            courseTitle: { type: String, required: true },
            courseSlug: { type: String, required: true },
            amount: { type: Number, required: true, min: 0 },
            originalAmount: { type: Number, min: 0 },
        },
    ],
    totalAmount: {
        type: Number,
        required: [true, "Total amount is required"],
        min: [0, "Amount cannot be negative"],
    },
    originalTotalAmount: { type: Number, min: 0 },
    discountAmount: { type: Number, min: 0 },
    status: {
        type: String,
        enum: ["pending", "confirmed", "processing", "completed", "cancelled", "refunded"],
        default: "pending",
        index: true,
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
        index: true,
    },
    paymentInfo: {
        method: {
            type: String,
            enum: ["bkash", "nagad", "rocket", "bank", "cash", "other"],
        },
        transactionId: { type: String, trim: true },
        senderNumber: { type: String, trim: true },
        paidAt: { type: Date },
        notes: { type: String },
    },
    notes: { type: String, trim: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    course: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
        index: true,
    },
    courseTitle: { type: String, required: true },
    courseSlug: { type: String, required: true },
    instructor: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", index: true },
    instructorName: { type: String },
    statusHistory: [
        {
            status: { type: String, required: true },
            note: { type: String },
            changedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
            changedAt: { type: Date, default: Date.now },
        },
    ],
    confirmedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
}, {
    timestamps: true,
});
// --- Indexes ---
PurchaseSchema.index({ studentPhone: 1, createdAt: -1 });
PurchaseSchema.index({ instructor: 1, createdAt: -1 });
PurchaseSchema.index({ status: 1, createdAt: -1 });
PurchaseSchema.index({ paymentStatus: 1, createdAt: -1 });
PurchaseSchema.index({ createdAt: -1 });
// --- Pre-save Hook (Mongoose 7+ compatible - no next() callback needed) ---
PurchaseSchema.pre("save", function () {
    // Calculate discount if not provided
    if (this.originalTotalAmount && !this.discountAmount) {
        this.discountAmount = this.originalTotalAmount - this.totalAmount;
    }
    // Ensure items array has at least one item (backward compatibility)
    if (this.items.length === 0 && this.course && this.courseTitle) {
        this.items.push({
            courseId: this.course,
            courseTitle: this.courseTitle,
            courseSlug: this.courseSlug,
            amount: this.totalAmount,
            originalAmount: this.originalTotalAmount,
        });
    }
    // Set status timestamps
    if (this.isModified("status")) {
        const now = new Date();
        if (this.status === "confirmed" && !this.confirmedAt) {
            this.confirmedAt = now;
        }
        if (this.status === "completed" && !this.completedAt) {
            this.completedAt = now;
        }
        if (this.status === "cancelled" && !this.cancelledAt) {
            this.cancelledAt = now;
        }
        // Add to status history
        this.statusHistory.push({
            status: this.status,
            changedAt: now,
        });
    }
    // Set payment status based on payment info
    if (this.isModified("paymentInfo") && this.paymentInfo?.paidAt) {
        this.paymentStatus = "paid";
    }
});
// --- Static Methods ---
PurchaseSchema.statics.findByPurchaseId = async function (purchaseId) {
    return this.findOne({ purchaseId });
};
PurchaseSchema.statics.findByPhone = async function (phone, limit = 10) {
    return this.find({ studentPhone: phone })
        .sort({ createdAt: -1 })
        .limit(limit);
};
PurchaseSchema.statics.getInstructorStats = async function (instructorId) {
    const stats = await this.aggregate([
        { $match: { instructor: new mongoose_1.default.Types.ObjectId(instructorId) } },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
                confirmed: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
                totalRevenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0] } },
            },
        },
    ]);
    return stats[0] || {
        total: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        totalRevenue: 0,
    };
};
PurchaseSchema.statics.getAdminStats = async function () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const stats = await this.aggregate([
        {
            $facet: {
                overall: [
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
                            confirmed: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } },
                            completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                            cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
                            totalRevenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0] } },
                        },
                    },
                ],
                today: [
                    { $match: { createdAt: { $gte: today } } },
                    {
                        $group: {
                            _id: null,
                            purchases: { $sum: 1 },
                            revenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0] } },
                        },
                    },
                ],
            },
        },
    ]);
    const overall = stats[0]?.overall[0] || {
        total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, totalRevenue: 0,
    };
    const todayStats = stats[0]?.today[0] || { purchases: 0, revenue: 0 };
    return {
        ...overall,
        todayPurchases: todayStats.purchases,
        todayRevenue: todayStats.revenue,
    };
};
PurchaseSchema.statics.findDuplicate = async function (phone, courseId) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.findOne({
        studentPhone: phone,
        course: courseId,
        createdAt: { $gte: oneDayAgo },
        status: { $ne: "cancelled" },
    });
};
// --- Virtual for formatted amount ---
PurchaseSchema.virtual("formattedAmount").get(function () {
    return `৳${this.totalAmount.toLocaleString("en-BD")}`;
});
PurchaseSchema.set("toJSON", { virtuals: true });
PurchaseSchema.set("toObject", { virtuals: true });
exports.default = mongoose_1.default.model("Purchase", PurchaseSchema);
