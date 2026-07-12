// src/controllers/freeBookingController.ts
import { Response } from "express";
import mongoose from "mongoose";
import FreeBooking from "../models/FreeBooking";

const ensureDbConnection = (res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      success: false,
      message: "Database is currently unavailable. Please try again shortly.",
    });
    return false;
  }
  return true;
};

export const createBooking = async (req: any, res: Response) => {
  try {
    const {
      studentName,
      guardianName,
      phone,
      countryCode,
      fullPhone,
      studentClass,
      course,
    } = req.body;

    // Basic validation
    if (!ensureDbConnection(res)) {
      return;
    }

    if (
      !studentName ||
      !guardianName ||
      !phone ||
      !countryCode ||
      !studentClass ||
      !course
    ) {
      res
        .status(400)
        .json({
          success: false,
          message: "Please provide all required fields",
        });
      return;
    }

    const newBooking = new FreeBooking({
      studentName,
      guardianName,
      phone,
      countryCode,
      fullPhone,
      studentClass,
      course,
    });

    await newBooking.save();

    res
      .status(201)
      .json({ success: true, message: "Booking submitted successfully!" });
  } catch (error: any) {
    console.error("Error creating booking:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error. Please try again." });
  }
};

export const getAllBookings = async (req: any, res: Response) => {
  try {
    if (!ensureDbConnection(res)) {
      return;
    }

    const bookings = await FreeBooking.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, bookings });
  } catch (error: any) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Delete a Booking
export const deleteBooking = async (req: any, res: Response) => {
  try {
    if (!ensureDbConnection(res)) {
      return;
    }

    const { id } = req.params;
    const deletedBooking = await FreeBooking.findByIdAndDelete(id);

    if (!deletedBooking) {
      res.status(404).json({ success: false, message: "Booking not found" });
      return;
    }

    res
      .status(200)
      .json({ success: true, message: "Booking deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
