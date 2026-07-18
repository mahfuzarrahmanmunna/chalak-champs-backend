"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserOrders = exports.getOrder = exports.verifyOrder = exports.createOrder = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const Enrollment_1 = __importDefault(require("../models/Enrollment"));
// ============================================================
// Create Order
// ============================================================
const createOrder = async (req, res) => {
    try {
        const { courseId, userId, userName, userEmail, userPhone, addons, paymentMethod, paymentPlan, promoCode, subtotal, discount, totalAmount, currency, } = req.body;
        // --- Validate required fields ---
        if (!courseId || !userId || !totalAmount) {
            res.status(400).json({
                success: false,
                message: "Missing required fields: courseId, userId, totalAmount",
            });
            return;
        }
        if (totalAmount <= 0) {
            res.status(400).json({
                success: false,
                message: "Total amount must be greater than 0",
            });
            return;
        }
        // --- Generate unique IDs ---
        const now = Date.now();
        const orderId = `ORD-${now}`;
        const tranId = `TXN-${now}`;
        // --- Check for duplicate pending orders (prevent double-submit) ---
        const recentDuplicate = await Order_1.default.findOne({
            userId,
            courseId,
            status: { $in: ["pending", "processing"] },
            createdAt: { $gte: new Date(now - 5 * 60 * 1000) }, // Within last 5 minutes
        });
        if (recentDuplicate) {
            // Return the existing order instead of creating a duplicate
            res.status(200).json({
                success: true,
                message: "Order already exists",
                orderId: recentDuplicate.orderId,
                tran_id: recentDuplicate.tranId,
            });
            return;
        }
        // --- Fetch course title (optional — frontend can send it) ---
        let courseTitle = req.body.courseTitle || "Course";
        let courseImage = req.body.courseImage || "";
        if (!req.body.courseTitle) {
            try {
                const Course = require("../models/Course").default;
                const courseDoc = await Course.findById(courseId);
                if (courseDoc) {
                    courseTitle = courseDoc.title || courseTitle;
                    courseImage = courseDoc.image || courseImage;
                }
            }
            catch {
                // Course model might not exist — use default
            }
        }
        // --- Create Order Document ---
        const order = new Order_1.default({
            orderId,
            tranId,
            courseId,
            courseTitle,
            courseImage,
            userId,
            userName: userName || "Unknown",
            userEmail: userEmail || "",
            userPhone: userPhone || "",
            addons: addons || [],
            paymentMethod: paymentMethod || "bkash",
            paymentPlan: paymentPlan || "full",
            promoCode: promoCode || null,
            subtotal: subtotal || totalAmount,
            discount: discount || 0,
            totalAmount,
            currency: currency || "BDT",
            status: "pending",
        });
        await order.save();
        console.log(`Order created: ${orderId} | Amount: ৳${totalAmount} | Method: ${order.paymentMethod}`);
        res.status(200).json({
            success: true,
            orderId,
            tran_id: tranId,
            message: "Order created successfully",
        });
    }
    catch (error) {
        console.error("Create Order Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create order",
        });
    }
};
exports.createOrder = createOrder;
// ============================================================
// Verify Payment (called after manual/offline payment confirmation)
// ============================================================
const verifyOrder = async (req, res) => {
    try {
        const { tran_id, status: paymentStatus } = req.body;
        if (!tran_id || !paymentStatus) {
            res.status(400).json({
                success: false,
                message: "Missing tran_id or status",
            });
            return;
        }
        const order = await Order_1.default.findOne({ tranId: tran_id });
        if (!order) {
            res.status(404).json({
                success: false,
                message: "Order not found",
            });
            return;
        }
        // --- If already verified, return cached result ---
        if (order.status === "paid") {
            res.status(200).json({
                success: true,
                message: "Payment already verified",
                orderId: order.orderId,
                status: "success",
            });
            return;
        }
        // --- Determine final status ---
        const isSuccess = paymentStatus === "success";
        if (!isSuccess) {
            await Order_1.default.updateOne({ tranId: tran_id }, {
                status: "failed",
            });
            res.status(400).json({
                success: false,
                message: "Payment was not successful",
                status: "failed",
            });
            return;
        }
        // --- Mark as paid ---
        await Order_1.default.updateOne({ tranId: tran_id }, {
            status: "paid",
            verifiedAt: new Date(),
        });
        // --- Create Enrollment (only on first successful payment) ---
        try {
            const existingEnrollment = await Enrollment_1.default.findOne({
                phone: order.userPhone,
                courseId: order.courseId,
            });
            if (!existingEnrollment) {
                await Enrollment_1.default.create({
                    name: order.userName,
                    phone: order.userPhone || order.userId,
                    courseId: order.courseId,
                    courseTitle: order.courseTitle,
                    amount: order.totalAmount.toString(),
                });
                console.log(`Enrollment created for ${order.userName} in ${order.courseTitle}`);
            }
        }
        catch (enrollmentError) {
            // Log but don't fail the verification — enrollment can be created manually
            console.error("Enrollment Creation Error (non-fatal):", enrollmentError);
        }
        res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            orderId: order.orderId,
            status: "success",
        });
    }
    catch (error) {
        console.error("Verify Order Error:", error);
        res.status(500).json({
            success: false,
            message: "Payment verification failed",
        });
    }
};
exports.verifyOrder = verifyOrder;
// ============================================================
// Get Order by ID (for receipt pages, etc.)
// ============================================================
const getOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order_1.default.findOne({
            $or: [{ orderId: id }, { tranId: id }],
        });
        if (!order) {
            res.status(404).json({ success: false, message: "Order not found" });
            return;
        }
        res.status(200).json({ success: true, order });
    }
    catch (error) {
        console.error("Get Order Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch order" });
    }
};
exports.getOrder = getOrder;
// ============================================================
// Get Orders by User
// ============================================================
const getUserOrders = async (req, res) => {
    try {
        const { userId } = req.params;
        const orders = await Order_1.default.find({ userId })
            .sort({ createdAt: -1 })
            .select("-gatewayResponse");
        res.status(200).json({ success: true, orders });
    }
    catch (error) {
        console.error("Get User Orders Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch orders",
        });
    }
};
exports.getUserOrders = getUserOrders;
