"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContactInquiries = exports.submitContactForm = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const Contact_1 = __importDefault(require("../models/Contact"));
// @desc    Submit a contact form inquiry
// @route   POST /api/contact
// @access  Public
exports.submitContactForm = (0, errorHandler_1.catchAsync)(async (req, res) => {
    const { studentName, guardianName, countryCode, phone, classLevel, message, contactMethod, } = req.body;
    // 1. Basic Validation
    if (!studentName || !guardianName || !phone || !classLevel) {
        return res.status(400).json({
            success: false,
            message: "Please fill all required fields (Name, Guardian, Phone, Class).",
        });
    }
    // 2. Save to Database
    const contactInquiry = await Contact_1.default.create({
        studentName,
        guardianName,
        countryCode: countryCode || "+880",
        phone,
        classLevel,
        message: message || "",
        contactMethod: contactMethod || "whatsapp",
    });
    // 3. Optional: Send an email notification to admin here
    // await sendEmail({ ... })
    // 4. Return Success Response
    res.status(201).json({
        success: true,
        message: "Inquiry submitted successfully! Our team will contact you soon.",
        data: contactInquiry,
    });
});
// @desc    Get all contact inquiries (For Admin Dashboard)
// @route   GET /api/contact
// @access  Private/Admin
exports.getContactInquiries = (0, errorHandler_1.catchAsync)(async (req, res) => {
    // Sort by newest first
    const inquiries = await Contact_1.default.find().sort("-createdAt");
    res.status(200).json({
        success: true,
        count: inquiries.length,
        data: inquiries,
    });
});
