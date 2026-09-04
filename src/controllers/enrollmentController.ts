import { Request, Response } from "express";
import Enrollment from "../models/Enrollment";
import ManualPayment from "../models/ManualPayment";
import { AuthRequest } from "../middleware/auth";

// Check if user is enrolled in a specific course
export const checkEnrollment = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { courseId } = req.body;
    const user = req.user;

    if (!courseId) {
      res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
      return;
    }

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
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
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
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
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const enrollments = await Enrollment.find({ user: user._id })
      .populate("course", "title thumbnail originalPrice offerPrice slug")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: enrollments,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
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
      res.status(400).json({
        success: false,
        message: "courseIds array is required",
      });
      return;
    }

    if (!user) {
      res.status(200).json({
        success: true,
        enrolledCourseIds: [],
      });
      return;
    }

    const enrollments = await Enrollment.find({
      user: user._id,
      course: { $in: courseIds },
      status: "active",
    }).select("course");

    const enrolledCourseIds = enrollments.map((e) => e.course.toString());

    res.status(200).json({
      success: true,
      enrolledCourseIds,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
