"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectManualPayment = exports.approveManualPayment = exports.getManualPayments = exports.submitManualPayment = void 0;
const ManualPayment_1 = __importDefault(require("../models/ManualPayment"));
const Enrollment_1 = __importDefault(require("../models/Enrollment"));
// User submits a manual payment
const submitManualPayment = async (req, res) => {
    try {
        const { courseId, userName, userPhone, paymentMethod, transactionId, amount, } = req.body;
        const user = req.user;
        if (!user) {
            res.status(401).json({
                success: false,
                message: "Unauthorized. Please login first.",
            });
            return;
        }
        if (!courseId ||
            !userName ||
            !userPhone ||
            !paymentMethod ||
            !transactionId ||
            !amount) {
            res.status(400).json({
                success: false,
                message: "All fields are required",
            });
            return;
        }
        // CHECK 1: Already enrolled
        const existingEnrollment = await Enrollment_1.default.findOne({
            user: user._id,
            course: courseId,
            status: "active",
        });
        if (existingEnrollment) {
            res.status(409).json({
                success: false,
                code: "ALREADY_ENROLLED",
                message: "আপনি ইতিমধ্যে এই কোর্সে এনরোল করেছেন।",
            });
            return;
        }
        // CHECK 2: Pending payment exists
        const existingPendingPayment = await ManualPayment_1.default.findOne({
            user: user._id,
            course: courseId,
            status: "pending",
        });
        if (existingPendingPayment) {
            res.status(409).json({
                success: false,
                code: "PENDING_PAYMENT_EXISTS",
                message: "আপনার আগের পেমেন্ট রিভিউ হচ্ছে। অনুগ্রহ করে অপেক্ষা করুন।",
            });
            return;
        }
        // CHECK 3: Duplicate transaction ID
        const duplicateTxId = await ManualPayment_1.default.findOne({
            transactionId: transactionId.trim(),
            status: { $ne: "rejected" },
        });
        if (duplicateTxId) {
            res.status(409).json({
                success: false,
                code: "DUPLICATE_TRANSACTION",
                message: "এই ট্রানজাকশন আইডি আগে ব্যবহার করা হয়েছে।",
            });
            return;
        }
        // Create payment
        const manualPayment = await ManualPayment_1.default.create({
            user: user._id,
            course: courseId,
            userName,
            userPhone,
            paymentMethod,
            transactionId: transactionId.trim(),
            amount,
            status: "pending",
        });
        res.status(201).json({
            success: true,
            message: "Payment submitted successfully. Pending admin approval.",
            data: manualPayment,
        });
    }
    catch (error) {
        console.error("Submit Manual Payment Error:", error);
        if (error.code === 11000) {
            res.status(409).json({
                success: false,
                code: "DUPLICATE_ENTRY",
                message: "আপনার আগের পেমেন্ট রিভিউ হচ্ছে।",
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: error.message || "Server Error",
        });
    }
};
exports.submitManualPayment = submitManualPayment;
// Admin gets all manual payments
const getManualPayments = async (req, res) => {
    try {
        const { status, page = 1, limit = 10, search } = req.query;
        const query = {};
        if (status)
            query.status = status;
        if (search) {
            query.$or = [
                { userName: { $regex: search, $options: "i" } },
                { userPhone: { $regex: search, $options: "i" } },
                { transactionId: { $regex: search, $options: "i" } },
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [payments, total] = await Promise.all([
            ManualPayment_1.default.find(query)
                .populate("course", "title thumbnail originalPrice offerPrice")
                .populate("user", "firstName lastName email phoneNumber")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            ManualPayment_1.default.countDocuments(query),
        ]);
        res.status(200).json({
            success: true,
            data: payments,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getManualPayments = getManualPayments;
// Admin approves manual payment
const approveManualPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await ManualPayment_1.default.findById(id);
        if (!payment) {
            res.status(404).json({ success: false, message: "Payment not found" });
            return;
        }
        if (payment.status === "approved") {
            res
                .status(400)
                .json({ success: false, message: "Payment already approved" });
            return;
        }
        payment.status = "approved";
        await payment.save();
        // Enroll user
        const existingEnrollment = await Enrollment_1.default.findOne({
            user: payment.user,
            course: payment.course,
        });
        if (!existingEnrollment) {
            await Enrollment_1.default.create({
                user: payment.user,
                course: payment.course,
                status: "active",
            });
        }
        res.status(200).json({
            success: true,
            message: "Payment approved and course assigned successfully",
        });
    }
    catch (error) {
        console.error("Approve Payment Error:", error);
        if (error.code === 11000) {
            res.status(200).json({
                success: true,
                message: "Payment approved. User was already enrolled.",
            });
            return;
        }
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.approveManualPayment = approveManualPayment;
// Admin rejects manual payment
const rejectManualPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await ManualPayment_1.default.findById(id);
        if (!payment) {
            res.status(404).json({ success: false, message: "Payment not found" });
            return;
        }
        payment.status = "rejected";
        await payment.save();
        res.status(200).json({
            success: true,
            message: "Payment rejected successfully",
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.rejectManualPayment = rejectManualPayment;
