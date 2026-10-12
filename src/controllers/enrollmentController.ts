import { Request, Response } from "express";
import Enrollment from "../models/Enrollment";
import ManualPayment from "../models/ManualPayment";
import { AuthRequest } from "../middleware/auth";
import mongoose from "mongoose";

// Check if user is enrolled in a specific course
export const checkEnrollment = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { courseId } = req.body;
    const user = req.user;

    if (!courseId) {
      res.status(400).json({ success: false, message: "Course ID is required" });
      return;
    }

    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const enrollment = await Enrollment.findOne({
      user: user._id,
      course: courseId,
      status: "active",
    });

    const pendingPayment = await ManualPayment.findOne({
      user: user._id,
      course: courseId,
      status: "pending",
    });

    res.status(200).json({
      success: true,
      isEnrolled: !!enrollment,
      hasPendingPayment: !!pendingPayment,
    });
  } catch (error: any) {
    console.error("Check Enrollment Error:", error);
    res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

// Get all enrollments for a user
export const getUserEnrollments = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const enrollments = await Enrollment.find({ user: user._id })
      .populate("course", "title thumbnail originalPrice offerPrice slug")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: enrollments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Check multiple enrollments at once
export const checkMultipleEnrollments = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { courseIds } = req.body;
    const user = req.user;

    if (!courseIds || !Array.isArray(courseIds)) {
      res.status(400).json({ success: false, message: "courseIds array is required" });
      return;
    }

    if (!user) {
      res.status(200).json({ success: true, enrolledCourseIds: [] });
      return;
    }

    const enrollments = await Enrollment.find({
      user: user._id,
      course: { $in: courseIds },
      status: "active",
    }).select("course");

    const enrolledCourseIds = enrollments.map((e) => e.course.toString());

    res.status(200).json({ success: true, enrolledCourseIds });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// ADMIN: Get all enrollments with populated data
// =============================================
export const getAllEnrollments = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const enrollments = await Enrollment.find()
      .populate("user", "firstName lastName phoneNumber email")
      .populate("course", "title offerPrice originalPrice")
      .sort({ createdAt: -1 })
      .lean();

    const formattedEnrollments = enrollments.map((en: any) => {
      const firstName = en.user?.firstName || "";
      const lastName = en.user?.lastName || "";
      return {
        _id: en._id.toString(),
        name: `${firstName} ${lastName}`.trim() || "Unknown User",
        phone: en.user?.phoneNumber || "N/A",
        email: en.user?.email || "",
        courseId: en.course?._id?.toString() || "",
        courseTitle: en.course?.title || "Unknown Course",
        amount: en.course?.offerPrice?.toString() || "0",
        status: en.status,
        createdAt: en.createdAt ? new Date(en.createdAt).toISOString() : new Date().toISOString(),
      };
    });

    res.status(200).json({
      success: true,
      enrollments: formattedEnrollments,
    });
  } catch (error: any) {
    console.error("Get All Enrollments Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// ADMIN: Delete an enrollment
// =============================================
export const deleteEnrollment = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid ID format" });
      return;
    }

    const deleted = await Enrollment.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Enrollment not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Enrollment deleted successfully" });
  } catch (error: any) {
    console.error("Delete Enrollment Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// ADMIN: Update enrollment status (Manage)
// =============================================
export const updateEnrollmentStatus = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "expired", "revoked"].includes(status)) {
      res.status(400).json({ success: false, message: "Invalid status provided" });
      return;
    }

    if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid ID format" });
      return;
    }

    const updated = await Enrollment.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      res.status(404).json({ success: false, message: "Enrollment not found" });
      return;
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Update Enrollment Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};