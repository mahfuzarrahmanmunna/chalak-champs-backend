import { Response } from "express";
import { catchAsync } from "../middleware/errorHandler";
import Contact from "../models/Contact";

// Extend the Request type to avoid TS errors if you don't have a custom AuthRequest setup
interface CustomRequest extends Request {
  body: any;
  user?: any;
}

// @desc    Submit a contact form inquiry
// @route   POST /api/contact
// @access  Public
export const submitContactForm = catchAsync(
  async (req: CustomRequest, res: Response) => {
    const {
      studentName,
      guardianName,
      countryCode,
      phone,
      classLevel,
      message,
      contactMethod,
    } = req.body;

    // 1. Basic Validation
    if (!studentName || !guardianName || !phone || !classLevel) {
      return res.status(400).json({
        success: false,
        message:
          "Please fill all required fields (Name, Guardian, Phone, Class).",
      });
    }

    // 2. Save to Database
    const contactInquiry = await Contact.create({
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
      message:
        "Inquiry submitted successfully! Our team will contact you soon.",
      data: contactInquiry,
    });
  },
);

// @desc    Get all contact inquiries (For Admin Dashboard)
// @route   GET /api/contact
// @access  Private/Admin
export const getContactInquiries = catchAsync(
  async (req: CustomRequest, res: Response) => {
    // Sort by newest first
    const inquiries = await Contact.find().sort("-createdAt");

    res.status(200).json({
      success: true,
      count: inquiries.length,
      data: inquiries,
    });
  },
);
