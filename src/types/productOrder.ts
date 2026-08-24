
// ═══════════════════════════════════════════════════════════════
// src/types/order.ts (Optional - for frontend use)
// ═══════════════════════════════════════════════════════════════
// Type definitions that match the backend Order model.
// Use these in your admin dashboard components.
// ═══════════════════════════════════════════════════════════════

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  productId: string;
  productTitle: string;
  quantity: number;
  amount: string;
}

export interface Order {
  _id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  status: OrderStatus;
  note: string;
  totalAmount: string;
  confirmedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  confirmedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  deliveredAt?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  success: boolean;
  count: number;
  pagination: {
    page: number;
    pages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  statusCounts: {
    total: number;
    pending: number;
    confirmed: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  data: Order[];
}

export interface OrderStatsResponse {
  success: boolean;
  data: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    byStatus: {
      pending: number;
      confirmed: number;
      processing: number;
      shipped: number;
      delivered: number;
      cancelled: number;
    };
  };
}

// Valid status transitions (mirror of backend)
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

// Status colors for UI
export const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
  confirmed: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  processing: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  shipped: { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
  delivered: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};