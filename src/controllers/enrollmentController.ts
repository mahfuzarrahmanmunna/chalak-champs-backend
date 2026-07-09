import { Response } from "express";
import Enrollment from "../models/Enrollment";

export const createEnrollment = async (req: any, res: Response) => {
  try {
    const { name, phone, email, courseId, courseTitle, amount } = req.body;

    // Only name and phone are required
    if (!name || !phone || !courseId || !courseTitle) {
      res.status(400).json({
        success: false,
        message: "Please provide name, phone, courseId, and courseTitle",
      });
      return;
    }

    const newEnrollment = new Enrollment({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      courseId,
      courseTitle,
      amount: amount || "0",
    });

    await newEnrollment.save();

    res.status(201).json({
      success: true,
      message: "Enrollment submitted successfully!",
    });
  } catch (error: any) {
    console.error("Error creating enrollment:", error);

    // Handle mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err: any) => err.message,
      );
      res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
      return;
    }

    res
      .status(500)
      .json({ success: false, message: "Server Error. Please try again." });
  }
};

export const getAllEnrollments = async (req: any, res: Response) => {
  try {
    const enrollments = await Enrollment.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, enrollments });
  } catch (error: any) {
    console.error("Error fetching enrollments:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const deleteEnrollment = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const deletedEnrollment = await Enrollment.findByIdAndDelete(id);

    if (!deletedEnrollment) {
      res.status(404).json({ success: false, message: "Enrollment not found" });
      return;
    }

    res
      .status(200)
      .json({ success: true, message: "Enrollment deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting enrollment:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
