"use strict";
// src/controllers/ProductOrderController.ts
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
exports.updateOrderStatus = exports.getOrderStats = exports.deleteOrder = exports.updateOrder = exports.getOrderById = exports.getAllOrders = exports.createOrder = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const ProductOrder_1 = __importStar(require("../models/ProductOrder"));
// ─── Helper: Safely get string from params ───
const getParam = (param) => {
    return Array.isArray(param) ? param[0] : param;
};
// ─── Helper: Validate status transition ───
const isValidTransition = (current, next) => {
    return ProductOrder_1.VALID_TRANSITIONS[current]?.includes(next) ?? false;
};
/* ═══════════════════════════════════════════════════
   POST /api/orders — CREATE ORDER (PUBLIC)
   ═══════════════════════════════════════════════════ */
exports.createOrder = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { name, phone, address, quantity, note, productId, productTitle, amount, } = req.body;
    if (!name?.trim()) {
        return next(new errorHandler_1.AppError("Name is required", 400));
    }
    if (!phone?.trim()) {
        return next(new errorHandler_1.AppError("Phone number is required", 400));
    }
    if (!address?.trim()) {
        return next(new errorHandler_1.AppError("Delivery address is required", 400));
    }
    if (!productId) {
        return next(new errorHandler_1.AppError("Product ID is required", 400));
    }
    if (!productTitle?.trim()) {
        return next(new errorHandler_1.AppError("Product title is required", 400));
    }
    if (!amount) {
        return next(new errorHandler_1.AppError("Amount is required", 400));
    }
    const qty = parseInt(quantity) || 1;
    const order = await ProductOrder_1.default.create({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerAddress: address.trim(),
        items: [
            {
                productId,
                productTitle: productTitle.trim(),
                quantity: Math.max(1, qty),
                amount,
            },
        ],
        note: note?.trim() || "",
        totalAmount: amount,
    });
    res.status(201).json({
        success: true,
        message: "Order placed successfully",
        data: order,
    });
});
/* ═══════════════════════════════════════════════════
   GET /api/orders — GET ALL ORDERS (ADMIN)
   ═══════════════════════════════════════ */
exports.getAllOrders = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { page = 1, limit = 20, status, search, startDate, endDate, sort = "createdAt", order = "desc", } = req.query;
    const query = {};
    // Status filter
    if (status && status !== "all") {
        const validStatuses = Object.values(ProductOrder_1.ORDER_STATUS);
        if (!validStatuses.includes(status)) {
            return next(new errorHandler_1.AppError(`Invalid status: ${status}`, 400));
        }
        query.status = status;
    }
    // Search by phone or name
    if (search) {
        const searchRegex = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        query.$or = [
            { customerPhone: searchRegex },
            { customerName: searchRegex },
            { "items.productTitle": searchRegex },
            { trackingNumber: searchRegex },
        ];
    }
    // Date range filter
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
            query.createdAt.$gte = new Date(String(startDate));
        }
        if (endDate) {
            const end = new Date(String(endDate));
            end.setHours(23, 59, 59, 999);
            query.createdAt.$lte = end;
        }
    }
    // Pagination
    const pageNum = parseInt(String(page)) || 1;
    const limitNum = parseInt(String(limit)) || 20;
    const skip = (pageNum - 1) * limitNum;
    // Sort
    const allowedSortFields = [
        "createdAt",
        "totalAmount",
        "status",
        "customerName",
    ];
    const sortField = allowedSortFields.includes(String(sort))
        ? String(sort)
        : "createdAt";
    const sortConfig = {
        [sortField]: String(order) === "asc" ? 1 : -1,
    };
    const [orders, total, statusCounts] = await Promise.all([
        ProductOrder_1.default.find(query)
            .sort(sortConfig)
            .skip(skip)
            .limit(limitNum)
            .populate("confirmedBy", "name email")
            .lean(),
        ProductOrder_1.default.countDocuments(query),
        ProductOrder_1.default.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);
    const statusCountMap = {};
    statusCounts.forEach((item) => {
        statusCountMap[item._id] = item.count;
    });
    res.status(200).json({
        success: true,
        count: orders.length,
        pagination: {
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            total,
            hasNext: pageNum * limitNum < total,
            hasPrev: pageNum > 1,
        },
        statusCounts: {
            total,
            pending: statusCountMap[ProductOrder_1.ORDER_STATUS.PENDING] || 0,
            confirmed: statusCountMap[ProductOrder_1.ORDER_STATUS.CONFIRMED] || 0,
            processing: statusCountMap[ProductOrder_1.ORDER_STATUS.PROCESSING] || 0,
            shipped: statusCountMap[ProductOrder_1.ORDER_STATUS.SHIPPED] || 0,
            delivered: statusCountMap[ProductOrder_1.ORDER_STATUS.DELIVERED] || 0,
            cancelled: statusCountMap[ProductOrder_1.ORDER_STATUS.CANCELLED] || 0,
        },
        data: orders,
    });
});
/* ═══════════════════════════════════════════════════
   GET /api/orders/:id — GET SINGLE ORDER (ADMIN)
   ═══════════════════════════════════════════════════ */
exports.getOrderById = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const orderId = getParam(req.params.id);
    const order = await ProductOrder_1.default.findById(orderId).populate("confirmedBy", "name email");
    if (!order) {
        return next(new errorHandler_1.AppError("Order not found", 404));
    }
    res.status(200).json({
        success: true,
        data: order,
    });
});
/* ═══════════════════════════════════════════════════
   PATCH /api/orders/:id — UPDATE ORDER (ADMIN)
   ═══════════════════════════════════════════════════ */
exports.updateOrder = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const orderId = getParam(req.params.id);
    const { status, trackingNumber, cancelReason, note } = req.body;
    const order = await ProductOrder_1.default.findById(orderId);
    if (!order) {
        return next(new errorHandler_1.AppError("Order not found", 404));
    }
    if (status) {
        const validStatuses = Object.values(ProductOrder_1.ORDER_STATUS);
        if (!validStatuses.includes(status)) {
            return next(new errorHandler_1.AppError(`Invalid status: ${status}`, 400));
        }
        if (!isValidTransition(order.status, status)) {
            return next(new errorHandler_1.AppError(`Cannot transition from "${order.status}" to "${status}". Valid: ${ProductOrder_1.VALID_TRANSITIONS[order.status]?.join(", ") || "none"}`, 400));
        }
        order.status = status;
        if (status === ProductOrder_1.ORDER_STATUS.CONFIRMED) {
            order.confirmedAt = new Date();
            order.confirmedBy = req.user?._id;
        }
        if (status === ProductOrder_1.ORDER_STATUS.CANCELLED) {
            order.cancelledAt = new Date();
            order.cancelReason = cancelReason || "Cancelled by admin";
        }
        if (status === ProductOrder_1.ORDER_STATUS.DELIVERED) {
            order.deliveredAt = new Date();
        }
    }
    if (trackingNumber !== undefined) {
        order.trackingNumber = trackingNumber.trim();
    }
    if (note !== undefined) {
        order.note = note.trim();
    }
    await order.save();
    const updatedOrder = await ProductOrder_1.default.findById(orderId).populate("confirmedBy", "name email");
    res.status(200).json({
        success: true,
        message: "Order updated successfully",
        data: updatedOrder,
    });
});
/* ═══════════════════════════════════════════════════
   DELETE /api/orders/:id — DELETE ORDER (ADMIN)
   ═══════════════════════════════════════════════════ */
exports.deleteOrder = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const orderId = getParam(req.params.id);
    const hardDelete = req.query.hard === "true";
    const order = await ProductOrder_1.default.findById(orderId);
    if (!order) {
        return next(new errorHandler_1.AppError("Order not found", 404));
    }
    if (hardDelete && order.status === ProductOrder_1.ORDER_STATUS.DELIVERED) {
        return next(new errorHandler_1.AppError("Cannot hard delete a delivered order.", 400));
    }
    if (hardDelete) {
        await ProductOrder_1.default.findByIdAndDelete(orderId);
        return res.status(200).json({
            success: true,
            message: "Order permanently deleted",
            data: null,
        });
    }
    if (order.status === ProductOrder_1.ORDER_STATUS.DELIVERED) {
        return next(new errorHandler_1.AppError("Cannot cancel a delivered order", 400));
    }
    if (order.status === ProductOrder_1.ORDER_STATUS.CANCELLED) {
        return next(new errorHandler_1.AppError("Order is already cancelled", 400));
    }
    order.status = ProductOrder_1.ORDER_STATUS.CANCELLED;
    order.cancelledAt = new Date();
    order.cancelReason = "Deleted by admin";
    await order.save();
    res.status(200).json({
        success: true,
        message: "Order cancelled",
        data: order,
    });
});
/* ═══════════════════════════════════════════════════
   GET /api/orders/stats — ORDER STATISTICS (ADMIN)
   ═══════════════════════════════════════════════════ */
exports.getOrderStats = (0, errorHandler_1.catchAsync)(async (req, res, _next) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - 7);
    const thisMonth = new Date(today);
    thisMonth.setDate(1);
    const [totalOrders, todayOrders, weekOrders, monthOrders, statusBreakdown] = await Promise.all([
        ProductOrder_1.default.countDocuments({}),
        ProductOrder_1.default.countDocuments({ createdAt: { $gte: today } }),
        ProductOrder_1.default.countDocuments({ createdAt: { $gte: thisWeek } }),
        ProductOrder_1.default.countDocuments({ createdAt: { $gte: thisMonth } }),
        ProductOrder_1.default.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);
    const statusMap = {};
    statusBreakdown.forEach((item) => {
        statusMap[item._id] = item.count;
    });
    res.status(200).json({
        success: true,
        data: {
            total: totalOrders,
            today: todayOrders,
            thisWeek: weekOrders,
            thisMonth: monthOrders,
            byStatus: {
                pending: statusMap[ProductOrder_1.ORDER_STATUS.PENDING] || 0,
                confirmed: statusMap[ProductOrder_1.ORDER_STATUS.CONFIRMED] || 0,
                processing: statusMap[ProductOrder_1.ORDER_STATUS.PROCESSING] || 0,
                shipped: statusMap[ProductOrder_1.ORDER_STATUS.SHIPPED] || 0,
                delivered: statusMap[ProductOrder_1.ORDER_STATUS.DELIVERED] || 0,
                cancelled: statusMap[ProductOrder_1.ORDER_STATUS.CANCELLED] || 0,
            },
        },
    });
});
/* ═══════════════════════════════════════════════════
   PATCH /api/orders/:id/status — QUICK STATUS UPDATE
   ═══════════════════════════════════════════════════ */
exports.updateOrderStatus = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const orderId = getParam(req.params.id);
    const { status, cancelReason } = req.body;
    if (!status) {
        return next(new errorHandler_1.AppError("Status is required", 400));
    }
    const validStatuses = Object.values(ProductOrder_1.ORDER_STATUS);
    if (!validStatuses.includes(status)) {
        return next(new errorHandler_1.AppError(`Invalid status: ${status}`, 400));
    }
    const order = await ProductOrder_1.default.findById(orderId);
    if (!order) {
        return next(new errorHandler_1.AppError("Order not found", 404));
    }
    if (!isValidTransition(order.status, status)) {
        return next(new errorHandler_1.AppError(`Cannot change status from "${order.status}" to "${status}"`, 400));
    }
    order.status = status;
    if (status === ProductOrder_1.ORDER_STATUS.CONFIRMED) {
        order.confirmedAt = new Date();
        order.confirmedBy = req.user?._id;
    }
    if (status === ProductOrder_1.ORDER_STATUS.CANCELLED) {
        order.cancelledAt = new Date();
        order.cancelReason = cancelReason || "Status changed to cancelled";
    }
    if (status === ProductOrder_1.ORDER_STATUS.DELIVERED) {
        order.deliveredAt = new Date();
    }
    await order.save();
    res.status(200).json({
        success: true,
        message: `Order status updated to "${status}"`,
        data: {
            _id: order._id,
            status: order.status,
            confirmedAt: order.confirmedAt,
            cancelledAt: order.cancelledAt,
            deliveredAt: order.deliveredAt,
        },
    });
});
