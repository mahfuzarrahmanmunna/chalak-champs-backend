import { Request, Response } from "express";
import Enrollment from "../models/Enrollment";

// Create a new enrollment
export const createEnrollment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { name, phone, courseId, courseTitle, amount } = req.body;

    if (!name || !phone || !courseId) {
      res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
      return;
    }

    // Check if phone number already enrolled for this course
    const existingEnrollment = await Enrollment.findOne({ phone, courseId });
    if (existingEnrollment) {
      res
        .status(400)
        .json({
          success: false,
          message: "You have already enrolled in this course.",
        });
      return;
    }

    const newEnrollment = new Enrollment({
      name,
      phone,
      courseId,
      courseTitle,
      amount,
    });

    await newEnrollment.save();

    res.status(201).json({
      success: true,
      message: "Enrollment successful!",
      enrollment: newEnrollment,
    });
  } catch (error: any) {
    console.error("Enrollment Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
