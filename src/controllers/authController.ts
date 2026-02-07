import { Request, Response } from "express";
import { auth } from "../config/firebase";
import User from "../models/User";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middleware/auth";
import {
  sendVerificationEmail,
  verifyEmailCode as verifyEmailCodeUtil,
} from "../utils/emailService";

// Send verification code for phone number
export const sendPhoneVerification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      res
        .status(400)
        .json({ success: false, message: "Phone number is required" });
      return;
    }

    // In a real app, you would use Firebase's phone authentication
    // For now, we'll just return a success response
    res.status(200).json({
      success: true,
      message: "Verification code sent successfully",
    });
  } catch (error: any) {
    console.error("Error sending phone verification:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send verification code",
    });
  }
};

// Verify phone number code
export const verifyPhoneCode = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      res.status(400).json({
        success: false,
        message: "Phone number and code are required",
      });
      return;
    }

    // In a real app, you would verify the code with Firebase
    // For now, we'll just return a success response
    res.status(200).json({
      success: true,
      message: "Phone number verified successfully",
    });
  } catch (error: any) {
    console.error("Error verifying phone code:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to verify phone code",
    });
  }
};

// Send verification code for email
export const sendEmailVerification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: "Email is required" });
      return;
    }

    // Send verification email
    const result = await sendVerificationEmail(email);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "Verification code sent to your email",
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || "Failed to send verification email",
      });
    }
  } catch (error: any) {
    console.error("Error sending email verification:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send verification email",
    });
  }
};

// Verify email code
export const verifyEmailCode = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({
        success: false,
        message: "Email and verification code are required",
      });
      return;
    }

    // Verify the email code
    const result = await verifyEmailCodeUtil(email, code);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "Email verified successfully",
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || "Invalid verification code",
      });
    }
  } catch (error: any) {
    console.error("Error verifying email code:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to verify email code",
    });
  }
};

// Register user
export const register = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { uid, firstName, lastName, email, phoneNumber, role } = req.body;

    if (!uid || !firstName || !lastName) {
      res
        .status(400)
        .json({ success: false, message: "Required fields are missing" });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ uid });
    if (existingUser) {
      res.status(400).json({ success: false, message: "User already exists" });
      return;
    }

    // Create new user
    const user = new User({
      uid,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email?.toLowerCase().trim() || null,
      phoneNumber: phoneNumber?.trim() || null,
      role: role || "student",
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { uid: user.uid, email: user.email },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "7d" },
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        uid: user.uid,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Error registering user:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      res.status(400).json({
        success: false,
        message: `${field} is already in use`,
      });
      return;
    }

    // Handle validation error
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

    res.status(500).json({
      success: false,
      message: error.message || "Failed to register user",
    });
  }
};

// Get user profile
export const getProfile = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        uid: req.user.uid,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        phoneNumber: req.user.phoneNumber,
        role: req.user.role,
      },
    });
  } catch (error: any) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Verify token
export const verifyToken = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    res.status(200).json({ success: true, message: "Token is valid" });
  } catch (error: any) {
    console.error("Verify token error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
