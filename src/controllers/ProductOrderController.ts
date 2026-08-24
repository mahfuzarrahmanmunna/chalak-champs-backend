// src/controllers/ProductOrderController.ts

import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { AppError, catchAsync } from "../middleware/errorHandler";
import Order, {
  IOrder,
  ORDER_STATUS,
  OrderStatus,
  VALID_TRANSITIONS,
} from "../models/ProductOrder";

// ─── Helper: Safely get string from params ───
const getParam = (param: string | string[]): string => {
  return Array.isArray(param) ? param[0] : param;
};

// ─── Helper: Validate status transition ───
const isValidTransition = (
  current: OrderStatus,
  next: OrderStatus,
): boolean => {
  return VALID_TRANSITIONS[current]?.includes(next) ?? false;
};

/* ═══════════════════════════════════════════════════
   POST /api/orders — CREATE ORDER (PUBLIC)
   ═══════════════════════════════════════════════════ */
export const createOrder = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const {
      name,
      phone,
      address,
      quantity,
      note,
      productId,
      productTitle,
      amount,
    } = req.body;

    if (!name?.trim()) {
      return next(new AppError("Name is required", 400));
    }
    if (!phone?.trim()) {
      return next(new AppError("Phone number is required", 400));
    }
    if (!address?.trim()) {
      return next(new AppError("Delivery address is required", 400));
    }
    if (!productId) {
      return next(new AppError("Product ID is required", 400));
    }
    if (!productTitle?.trim()) {
      return next(new AppError("Product title is required", 400));
    }
    if (!amount) {
      return next(new AppError("Amount is required", 400));
    }

    const qty = parseInt(quantity) || 1;

    const order = await Order.create({
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
  },
);

/* ═══════════════════════════════════════════════════
   GET /api/orders — GET ALL ORDERS (ADMIN)
   ═══════════════════════════════════════ */
export const getAllOrders = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      startDate,
      endDate,
      sort = "createdAt",
      order = "desc",
    } = req.query;

    const query: any = {};

    // Status filter
    if (status && status !== "all") {
      const validStatuses = Object.values(ORDER_STATUS);
      if (!validStatuses.includes(status as OrderStatus)) {
        return next(new AppError(`Invalid status: ${status}`, 400));
      }
      query.status = status;
    }

    // Search by phone or name
    if (search) {
      const searchRegex = new RegExp(
        String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );
      query.$or = [
        { customerPhone: searchRegex },
        { customerName: searchRegex },
        { "items.productTitle": searchRegex },
        { trackingNumber: searchRegex },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {} as any;
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
    const sortField: string = allowedSortFields.includes(String(sort))
      ? String(sort)
      : "createdAt";
    const sortConfig: Record<string, 1 | -1> = {
      [sortField]: String(order) === "asc" ? 1 : -1,
    };

    const [orders, total, statusCounts] = await Promise.all([
      Order.find(query)
        .sort(sortConfig)
        .skip(skip)
        .limit(limitNum)
        .populate("confirmedBy", "name email")
        .lean(),
      Order.countDocuments(query),
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    const statusCountMap: Record<string, number> = {};
    statusCounts.forEach((item: any) => {
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
        pending: statusCountMap[ORDER_STATUS.PENDING] || 0,
        confirmed: statusCountMap[ORDER_STATUS.CONFIRMED] || 0,
        processing: statusCountMap[ORDER_STATUS.PROCESSING] || 0,
        shipped: statusCountMap[ORDER_STATUS.SHIPPED] || 0,
        delivered: statusCountMap[ORDER_STATUS.DELIVERED] || 0,
        cancelled: statusCountMap[ORDER_STATUS.CANCELLED] || 0,
      },
      data: orders,
    });
  },
);

/* ═══════════════════════════════════════════════════
   GET /api/orders/:id — GET SINGLE ORDER (ADMIN)
   ═══════════════════════════════════════════════════ */
export const getOrderById = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const orderId = getParam(req.params.id);

    const order = await Order.findById(orderId).populate(
      "confirmedBy",
      "name email",
    );

    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  },
);

/* ═══════════════════════════════════════════════════
   PATCH /api/orders/:id — UPDATE ORDER (ADMIN)
   ═══════════════════════════════════════════════════ */
export const updateOrder = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const orderId = getParam(req.params.id);
    const { status, trackingNumber, cancelReason, note } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    if (status) {
      const validStatuses = Object.values(ORDER_STATUS);
      if (!validStatuses.includes(status)) {
        return next(new AppError(`Invalid status: ${status}`, 400));
      }

      if (!isValidTransition(order.status as OrderStatus, status)) {
        return next(
          new AppError(
            `Cannot transition from "${order.status}" to "${status}". Valid: ${VALID_TRANSITIONS[order.status as OrderStatus]?.join(", ") || "none"}`,
            400,
          ),
        );
      }

      order.status = status;

      if (status === ORDER_STATUS.CONFIRMED) {
        order.confirmedAt = new Date();
        order.confirmedBy = req.user?._id;
      }
      if (status === ORDER_STATUS.CANCELLED) {
        order.cancelledAt = new Date();
        order.cancelReason = cancelReason || "Cancelled by admin";
      }
      if (status === ORDER_STATUS.DELIVERED) {
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

    const updatedOrder = await Order.findById(orderId).populate(
      "confirmedBy",
      "name email",
    );

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: updatedOrder,
    });
  },
);

/* ═══════════════════════════════════════════════════
   DELETE /api/orders/:id — DELETE ORDER (ADMIN)
   ═══════════════════════════════════════════════════ */
export const deleteOrder = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const orderId = getParam(req.params.id);
    const hardDelete = req.query.hard === "true";

    const order = await Order.findById(orderId);

    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    if (hardDelete && order.status === ORDER_STATUS.DELIVERED) {
      return next(new AppError("Cannot hard delete a delivered order.", 400));
    }

    if (hardDelete) {
      await Order.findByIdAndDelete(orderId);
      return res.status(200).json({
        success: true,
        message: "Order permanently deleted",
        data: null,
      });
    }

    if (order.status === ORDER_STATUS.DELIVERED) {
      return next(new AppError("Cannot cancel a delivered order", 400));
    }

    if (order.status === ORDER_STATUS.CANCELLED) {
      return next(new AppError("Order is already cancelled", 400));
    }

    order.status = ORDER_STATUS.CANCELLED;
    order.cancelledAt = new Date();
    order.cancelReason = "Deleted by admin";
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled",
      data: order,
    });
  },
);

/* ═══════════════════════════════════════════════════
   GET /api/orders/stats — ORDER STATISTICS (ADMIN)
   ═══════════════════════════════════════════════════ */
export const getOrderStats = catchAsync(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - 7);

    const thisMonth = new Date(today);
    thisMonth.setDate(1);

    const [totalOrders, todayOrders, weekOrders, monthOrders, statusBreakdown] =
      await Promise.all([
        Order.countDocuments({}),
        Order.countDocuments({ createdAt: { $gte: today } }),
        Order.countDocuments({ createdAt: { $gte: thisWeek } }),
        Order.countDocuments({ createdAt: { $gte: thisMonth } }),
        Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      ]);

    const statusMap: Record<string, number> = {};
    statusBreakdown.forEach((item: any) => {
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
          pending: statusMap[ORDER_STATUS.PENDING] || 0,
          confirmed: statusMap[ORDER_STATUS.CONFIRMED] || 0,
          processing: statusMap[ORDER_STATUS.PROCESSING] || 0,
          shipped: statusMap[ORDER_STATUS.SHIPPED] || 0,
          delivered: statusMap[ORDER_STATUS.DELIVERED] || 0,
          cancelled: statusMap[ORDER_STATUS.CANCELLED] || 0,
        },
      },
    });
  },
);

/* ═══════════════════════════════════════════════════
   PATCH /api/orders/:id/status — QUICK STATUS UPDATE
   ═══════════════════════════════════════════════════ */
export const updateOrderStatus = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const orderId = getParam(req.params.id);
    const { status, cancelReason } = req.body;

    if (!status) {
      return next(new AppError("Status is required", 400));
    }

    const validStatuses = Object.values(ORDER_STATUS);
    if (!validStatuses.includes(status)) {
      return next(new AppError(`Invalid status: ${status}`, 400));
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    if (!isValidTransition(order.status as OrderStatus, status)) {
      return next(
        new AppError(
          `Cannot change status from "${order.status}" to "${status}"`,
          400,
        ),
      );
    }

    order.status = status;

    if (status === ORDER_STATUS.CONFIRMED) {
      order.confirmedAt = new Date();
      order.confirmedBy = req.user?._id;
    }
    if (status === ORDER_STATUS.CANCELLED) {
      order.cancelledAt = new Date();
      order.cancelReason = cancelReason || "Status changed to cancelled";
    }
    if (status === ORDER_STATUS.DELIVERED) {
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
  },
);
