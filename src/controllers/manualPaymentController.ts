import { Request, Response } from "express";
import ManualPayment from "../models/ManualPayment";
import Enrollment from "../models/Enrollment";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth";

// User submits a manual payment
export const submitManualPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId, userName, userPhone, paymentMethod, transactionId, amount } = req.body;
    const firebaseUid = req.user?.uid;

    if (!courseId || !userName || !userPhone || !paymentMethod || !transactionId || !amount) {
      res.status(400).json({ success: false, message: "All fields are required" });
      return;
    }

    const user = await User.findOne({ uid: firebaseUid });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found. Please login first." });
      return;
    }

    const manualPayment = await ManualPayment.create({
      user: user._id,
      course: courseId,
      userName,
      userPhone,
      paymentMethod,
      transactionId,
      amount,
      status: "pending",
    });

    res.status(201).json({ 
      success: true, 
      message: "Payment submitted successfully. Pending admin approval.",
      data: manualPayment
    });
  } catch (error: any) {
    console.error("Submit Manual Payment Error:", error);
    res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

// Admin gets all manual payments
export const getManualPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const query: any = {};
    if (status) query.status = status;

    const payments = await ManualPayment.find(query)
      .populate("course", "title thumbnail originalPrice offerPrice")
      .populate("user", "firstName lastName email phoneNumber")
      .sort({ createdAt: -1 });
      
    res.status(200).json({ success: true, data: payments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin approves manual payment and assigns course
export const approveManualPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // ManualPayment ID
    
    const payment = await ManualPayment.findById(id);
    if (!payment) {
      res.status(404).json({ success: false, message: "Payment not found" });
      return;
    }

    if (payment.status === "approved") {
      res.status(400).json({ success: false, message: "Payment already approved" });
      return;
    }

    // 1. Update payment status
    payment.status = "approved";
    await payment.save();

    // 2. Enroll the user in the course
    const existingEnrollment = await Enrollment.findOne({
      user: payment.user,
      course: payment.course,
    });

    if (!existingEnrollment) {
      await Enrollment.create({
        user: payment.user,
        course: payment.course,
        status: "active",
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Payment approved and course assigned successfully" 
    });
  } catch (error: any) {
    console.error("Approve Payment Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin rejects manual payment
export const rejectManualPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const payment = await ManualPayment.findById(id);
    if (!payment) {
      res.status(404).json({ success: false, message: "Payment not found" });
      return;
    }

    payment.status = "rejected";
    await payment.save();

    res.status(200).json({ 
      success: true, 
      message: "Payment rejected successfully" 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};