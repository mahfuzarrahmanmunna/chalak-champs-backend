
import mongoose, { Document, Schema, Types } from "mongoose";

// Status values with allowed transitions
export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

// Valid status transitions (current → allowed next statuses)
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [], // Terminal state
  [ORDER_STATUS.CANCELLED]: [], // Terminal state
};

export interface IOrderItem {
  productId: string;
  productTitle: string;
  quantity: number;
  amount: string; // Stored as string to preserve ৳ symbol
}

export interface IOrder extends Document {
  // Customer Info
  customerName: string;
  customerPhone: string;
  customerAddress: string;

  // Order Items (single item for now, array for future cart support)
  items: IOrderItem[];

  // Order Metadata
  status: OrderStatus;
  note: string;
  totalAmount: string; // Computed from items

  // Admin fields
  confirmedBy?: Types.ObjectId;
  confirmedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  deliveredAt?: Date;
  trackingNumber?: string;

  // Timestamps (automatic via mongoose)
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema: Schema = new Schema({
  productId: {
    type: String,
    required: true,
  },
  productTitle: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"],
  },
  amount: {
    type: String,
    required: true,
  },
});

const OrderSchema: Schema = new Schema(
  {
    // Customer Info
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    customerPhone: {
      type: String,
      required: [true, "Customer phone is required"],
      trim: true,
      validate: {
        validator: function (v: string) {
          return /^01[3-9]\d{8}$/.test(v);
        },
        message: "Please enter a valid Bangladesh phone number (01XXXXXXXXX)",
      },
    },
    customerAddress: {
      type: String,
      required: [true, "Delivery address is required"],
      trim: true,
      minlength: [10, "Address is too short"],
      maxlength: [500, "Address cannot exceed 500 characters"],
    },

    // Order Items
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: function (items: IOrderItem[]) {
          return items.length > 0;
        },
        message: "Order must have at least one item",
      },
    },

    // Order Metadata
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      index: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, "Note cannot exceed 500 characters"],
      default: "",
    },
    totalAmount: {
      type: String,
      required: true,
    },

    // Admin fields
    confirmedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    confirmedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancelReason: {
      type: String,
      trim: true,
      maxlength: [300, "Cancel reason cannot exceed 300 characters"],
    },
    deliveredAt: {
      type: Date,
    },
    trackingNumber: {
      type: String,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
    // Add virtual for formatted date
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  },
);

// Indexes for common queries
OrderSchema.index({ customerPhone: 1, status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

// Prevent model overwrite during hot-reload
const Order =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default Order;
