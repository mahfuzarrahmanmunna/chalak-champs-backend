import mongoose, { Document, Schema } from "mongoose";
import { PurchaseStatus, PaymentStatus, IPurchaseItem, IPaymentInfo } from "../types/purchase.types";

// --- Helpers ---
const generatePurchaseId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PUR-${timestamp}-${random}`;
};

// --- Interfaces ---
export interface IPurchase extends Document {
  purchaseId: string;
  studentName: string;
  studentPhone: string;
  studentEmail?: string;
  items: IPurchaseItem[];
  totalAmount: number;
  originalTotalAmount?: number;
  discountAmount?: number;
  
  // Status
  status: PurchaseStatus;
  paymentStatus: PaymentStatus;
  paymentInfo?: IPaymentInfo;
  
  // Metadata
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // References
  course: mongoose.Types.ObjectId;
  courseTitle: string;
  courseSlug: string;
  instructor?: mongoose.Types.ObjectId;
  instructorName?: string;
  
  // Status History
  statusHistory: Array<{
    status: PurchaseStatus;
    note?: string;
    changedBy?: mongoose.Types.ObjectId;
    changedAt: Date;
  }>;
  
  // Timestamps
  confirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---
const PurchaseSchema = new Schema<IPurchase>(
  {
    purchaseId: {
      type: String,
      unique: true,
      index: true,
      default: generatePurchaseId,
    },
    
    // Student Info
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
        validator: function (v: string) {
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
        validator: function (v: string) {
          if (!v) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Please enter a valid email address",
      },
    },
    
    // Purchase Items (for future multi-course support)
    items: [
      {
        courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
        courseTitle: { type: String, required: true },
        courseSlug: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        originalAmount: { type: Number, min: 0 },
      },
    ],
    
    // Amounts
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    originalTotalAmount: { type: Number, min: 0 },
    discountAmount: { type: Number, min: 0 },
    
    // Status
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
    
    // Metadata
    notes: { type: String, trim: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    
    // Course Reference (denormalized for quick queries)
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    courseTitle: { type: String, required: true },
    courseSlug: { type: String, required: true },
    
    // Instructor Reference
    instructor: { type: Schema.Types.ObjectId, ref: "User", index: true },
    instructorName: { type: String },
    
    // Status History
    statusHistory: [
      {
        status: { type: String, required: true },
        note: { type: String },
        changedBy: { type: Schema.Types.ObjectId, ref: "User" },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    
    // Status Timestamps
    confirmedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// --- Indexes ---
PurchaseSchema.index({ studentPhone: 1, createdAt: -1 });
PurchaseSchema.index({ instructor: 1, createdAt: -1 });
PurchaseSchema.index({ status: 1, createdAt: -1 });
PurchaseSchema.index({ paymentStatus: 1, createdAt: -1 });
PurchaseSchema.index({ createdAt: -1 });

// --- Pre-save Hook ---
PurchaseSchema.pre("save", function (next) {
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
  
  next();
});

// --- Static Methods ---

// Get purchase by purchaseId
PurchaseSchema.statics.findByPurchaseId = async function (purchaseId: string) {
  return this.findOne({ purchaseId });
};

// Get purchases by phone
PurchaseSchema.statics.findByPhone = async function (phone: string, limit: number = 10) {
  return this.find({ studentPhone: phone })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Get purchase stats for an instructor
PurchaseSchema.statics.getInstructorStats = async function (instructorId: string) {
  const stats = await this.aggregate([
    { $match: { instructor: new mongoose.Types.ObjectId(instructorId) } },
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

// Get purchase stats (admin)
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

// Check for duplicate purchases (same phone, same course, within last 24 hours)
PurchaseSchema.statics.findDuplicate = async function (phone: string, courseId: string) {
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

// Ensure virtuals are included in JSON output
PurchaseSchema.set("toJSON", { virtuals: true });
PurchaseSchema.set("toObject", { virtuals: true });

interface IPurchaseModel extends mongoose.Model<IPurchase> {
  findByPurchaseId(purchaseId: string): Promise<IPurchase | null>;
  findByPhone(phone: string, limit?: number): Promise<IPurchase[]>;
  getInstructorStats(instructorId: string): Promise<any>;
  getAdminStats(): Promise<any>;
  findDuplicate(phone: string, courseId: string): Promise<IPurchase | null>;
}

export default mongoose.model<IPurchase, IPurchaseModel>("Purchase", PurchaseSchema);