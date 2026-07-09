"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEnrollment = exports.getAllEnrollments = exports.createEnrollment = void 0;
const Enrollment_1 = __importDefault(require("../models/Enrollment"));
const createEnrollment = async (req, res) => {
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
        const newEnrollment = new Enrollment_1.default({
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
    }
    catch (error) {
        console.error("Error creating enrollment:", error);
        // Handle mongoose validation errors
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((err) => err.message);
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
exports.createEnrollment = createEnrollment;
const getAllEnrollments = async (req, res) => {
    try {
        const enrollments = await Enrollment_1.default.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, enrollments });
    }
    catch (error) {
        console.error("Error fetching enrollments:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
exports.getAllEnrollments = getAllEnrollments;
const deleteEnrollment = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedEnrollment = await Enrollment_1.default.findByIdAndDelete(id);
        if (!deletedEnrollment) {
            res.status(404).json({ success: false, message: "Enrollment not found" });
            return;
        }
        res
            .status(200)
            .json({ success: true, message: "Enrollment deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting enrollment:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
exports.deleteEnrollment = deleteEnrollment;
