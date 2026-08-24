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
exports.VALID_TRANSITIONS = exports.ORDER_STATUS = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Status values with allowed transitions
exports.ORDER_STATUS = {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    PROCESSING: "processing",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
};
// Valid status transitions (current → allowed next statuses)
exports.VALID_TRANSITIONS = {
    [exports.ORDER_STATUS.PENDING]: [exports.ORDER_STATUS.CONFIRMED, exports.ORDER_STATUS.CANCELLED],
    [exports.ORDER_STATUS.CONFIRMED]: [exports.ORDER_STATUS.PROCESSING, exports.ORDER_STATUS.CANCELLED],
    [exports.ORDER_STATUS.PROCESSING]: [exports.ORDER_STATUS.SHIPPED, exports.ORDER_STATUS.CANCELLED],
    [exports.ORDER_STATUS.SHIPPED]: [exports.ORDER_STATUS.DELIVERED],
    [exports.ORDER_STATUS.DELIVERED]: [], // Terminal state
    [exports.ORDER_STATUS.CANCELLED]: [], // Terminal state
};
const OrderItemSchema = new mongoose_1.Schema({
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
const OrderSchema = new mongoose_1.Schema({
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
            validator: function (v) {
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
            validator: function (items) {
                return items.length > 0;
            },
            message: "Order must have at least one item",
        },
    },
    // Order Metadata
    status: {
        type: String,
        enum: Object.values(exports.ORDER_STATUS),
        default: exports.ORDER_STATUS.PENDING,
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
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: true,
    // Add virtual for formatted date
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
});
// Indexes for common queries
OrderSchema.index({ customerPhone: 1, status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
// Prevent model overwrite during hot-reload
const Order = mongoose_1.default.models.Order || mongoose_1.default.model("Order", OrderSchema);
exports.default = Order;
