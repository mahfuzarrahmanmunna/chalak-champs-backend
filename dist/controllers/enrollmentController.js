"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEnrollment = void 0;
const Enrollment_1 = __importDefault(require("../models/Enrollment"));
// Create a new enrollment
const createEnrollment = async (req, res) => {
    try {
        const { name, phone, courseId, courseTitle, amount } = req.body;
        if (!name || !phone || !courseId) {
            res
                .status(400)
                .json({ success: false, message: "Missing required fields" });
            return;
        }
        // Check if phone number already enrolled for this course
        const existingEnrollment = await Enrollment_1.default.findOne({ phone, courseId });
        if (existingEnrollment) {
            res
                .status(400)
                .json({
                success: false,
                message: "You have already enrolled in this course.",
            });
            return;
        }
        const newEnrollment = new Enrollment_1.default({
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
    }
    catch (error) {
        console.error("Enrollment Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.createEnrollment = createEnrollment;
