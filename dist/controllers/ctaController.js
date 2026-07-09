"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBooking = exports.getAllBookings = exports.createBooking = void 0;
const Contact_1 = __importDefault(require("../models/Contact")); // Assuming you named the model 'Contact'
// 1. Create Booking (Public)
const createBooking = async (req, res) => {
    try {
        const { studentName, fatherName, phone, class: studentClass, country, } = req.body;
        // Basic validation
        if (!studentName || !fatherName || !phone || !studentClass || !country) {
            res.status(400).json({
                success: false,
                message: "Please provide all required fields",
            });
            return;
        }
        const newBooking = new Contact_1.default({
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
    }
    catch (error) {
        console.error("Error creating booking:", error);
        res
            .status(500)
            .json({ success: false, message: "Server Error. Please try again." });
    }
};
exports.createBooking = createBooking;
// 2. Get All Bookings (Admin)
const getAllBookings = async (req, res) => {
    try {
        // Sort by newest first
        const bookings = await Contact_1.default.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, bookings });
    }
    catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
exports.getAllBookings = getAllBookings;
// 3. Delete a Booking (Admin)
const deleteBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedBooking = await Contact_1.default.findByIdAndDelete(id);
        if (!deletedBooking) {
            res.status(404).json({ success: false, message: "Booking not found" });
            return;
        }
        res
            .status(200)
            .json({ success: true, message: "Booking deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting booking:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
exports.deleteBooking = deleteBooking;
