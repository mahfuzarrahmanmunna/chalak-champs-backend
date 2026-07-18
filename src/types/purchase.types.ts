import { Types } from "mongoose";

export interface IPurchaseItem {
  courseId: Types.ObjectId;
  courseTitle: string;
  courseSlug: string;
  amount: number;
  originalAmount?: number;
}

export interface IPaymentInfo {
  method: "bkash" | "nagad" | "rocket" | "bank" | "cash" | "other";
  transactionId?: string;
  senderNumber?: string;
  paidAt?: Date;
  notes?: string;
}

export interface IPurchaseFilters {
  status?: string;
  paymentStatus?: string;
  courseId?: string;
  studentPhone?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface IPurchaseStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  totalRevenue: number;
  todayPurchases: number;
  todayRevenue: number;
}

export type PurchaseStatus = "pending" | "confirmed" | "processing" | "completed" | "cancelled" | "refunded";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";