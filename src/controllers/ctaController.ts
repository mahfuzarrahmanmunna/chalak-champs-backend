import { Response } from "express";
import Contact from "../models/Contact"; // Assuming you named the model 'Contact'

// 1. Create Booking (Public)
export const createBooking = async (req: any, res: Response) => {
  try {
    const {
      studentName,
      fatherName,
      phone,
      class: studentClass,
      country,
    } = req.body;

    // Basic validation
    if (!studentName || !fatherName || !phone || !studentClass || !country) {
      res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
      return;
    }

    const newBooking = new Contact({
      studentName,
      fatherName,
      phone,
      class: studentClass,
      country, // Stores the whole object (flag, code, name)
    });

    await newBooking.save();

    res
      .status(201)
      .json({ success: true, message: "Form Submitted Successfully!" });
  } catch (error: any) {
    console.error("Error creating booking:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error. Please try again." });
  }
};

// 2. Get All Bookings (Admin)
export const getAllBookings = async (req: any, res: Response) => {
  try {
    // Sort by newest first
    const bookings = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, bookings });
  } catch (error: any) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 3. Delete a Booking (Admin)
export const deleteBooking = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const deletedBooking = await Contact.findByIdAndDelete(id);

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
