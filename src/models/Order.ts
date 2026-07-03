// src/models/Order.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IOrder extends Document {
  orderId: string;
  tranId: string;
  courseId: string;
  courseTitle: string;
  courseImage?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  addons: number[];
  paymentMethod: string;
  paymentPlan: "full" | "monthly";
  promoCode: string | null;
  subtotal: number;
  discount: number;
  totalAmount: number;
  currency: string;
  status:
    | "pending"
    | "processing"
    | "paid"
    | "failed"
    | "cancelled"
    | "expired";
  gatewayResponse?: Record<string, unknown>;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema(
  {
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
    gatewayResponse: { type: Schema.Types.Mixed, default: null },
    verifiedAt: { type: Date },
  },
  { timestamps: true },
);

// Only index fields that DON'T already have unique: true
OrderSchema.index({ userId: 1 });
OrderSchema.index({ courseId: 1 });
OrderSchema.index({ status: 1 });

export default mongoose.model<IOrder>("Order", OrderSchema);
