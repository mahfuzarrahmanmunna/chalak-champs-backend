"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBooking = exports.getAllBookings = exports.createBooking = void 0;
const FreeBooking_1 = __importDefault(require("../models/FreeBooking"));
const createBooking = async (req, res) => {
    try {
        const { studentName, guardianName, phone, countryCode, fullPhone, studentClass, course, } = req.body;
        // Basic validation
        if (!studentName ||
            !guardianName ||
            !phone ||
            !countryCode ||
            !studentClass ||
            !course) {
            res
                .status(400)
                .json({
                success: false,
                message: "Please provide all required fields",
            });
            return;
        }
        const newBooking = new FreeBooking_1.default({
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
    }
    catch (error) {
        console.error("Error creating booking:", error);
        res
            .status(500)
            .json({ success: false, message: "Server Error. Please try again." });
    }
};
exports.createBooking = createBooking;
const getAllBookings = async (req, res) => {
    try {
        const bookings = await FreeBooking_1.default.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, bookings });
    }
    catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
exports.getAllBookings = getAllBookings;
// Delete a Booking
const deleteBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedBooking = await FreeBooking_1.default.findByIdAndDelete(id);
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
