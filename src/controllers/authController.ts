import { Request, Response } from "express";
import { auth } from "../config/firebase";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth";
import {
  sendVerificationEmail,
  verifyEmailCode as verifyEmailCodeUtil,
} from "../utils/emailService";
import {
  sendPhoneVerification as sendPhoneVerificationUtil,
  verifyPhoneCodeUtil,
} from "../utils/phoneService";

// Send verification code for phone number
export const sendPhoneVerification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      res.status(400).json({ success: false, message: "Phone number is required" });
      return;
    }
    const result = await sendPhoneVerificationUtil(phoneNumber);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message || "Verification code sent successfully",
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || "Failed to send verification code",
      });
    }
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
      res
        .status(400)
        .json({
          success: false,
          message: "Phone number and verification code are required",
        });
      return;
    }
    const result = await verifyPhoneCodeUtil(phoneNumber, code);
    if (result.success) {
      res
        .status(200)
        .json({ success: true, message: "Phone number verified successfully" });
    } else {
      res
        .status(400)
        .json({
          success: false,
          message: result.message || "Invalid verification code",
        });
    }
  } catch (error: any) {
    console.error("Error verifying phone code:", error);
    res
      .status(500)
      .json({
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
    const result = await sendVerificationEmail(email);
    if (!result.success) {
      res
        .status(500)
        .json({
          success: false,
          message: result.message || "Failed to send verification code",
        });
      return;
    }
    res
      .status(200)
      .json({
        success: true,
        message: result.message || "Verification code sent to your email",
      });
  } catch (error: any) {
    console.error("Error sending email verification:", error);
    res
      .status(500)
      .json({
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
      res
        .status(400)
        .json({
          success: false,
          message: "Email and verification code are required",
        });
      return;
    }
    const result = await verifyEmailCodeUtil(email, code);
    if (result.success) {
      res
        .status(200)
        .json({ success: true, message: "Email verified successfully" });
    } else {
      res
        .status(400)
        .json({
          success: false,
          message: result.message || "Invalid verification code",
        });
    }
  } catch (error: any) {
    console.error("Error verifying email code:", error);
    res
      .status(500)
      .json({
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

    if (!uid || !firstName) {
      res
        .status(400)
        .json({ success: false, message: "Required fields are missing" });
      return;
    }

    // ✅ FIXED: Changed "" to undefined so Mongoose doesn't crash on required field
    const normalizedLastName = lastName?.trim() || undefined;
    const normalizedEmail = email?.toLowerCase().trim() || undefined;
    const normalizedPhoneNumber = phoneNumber?.trim() || undefined;

    const existingUser = await User.findOne({ uid });
    if (existingUser) {
      if (existingUser.firstName === "User") {
        existingUser.firstName = firstName.trim();
        existingUser.lastName = normalizedLastName; // ✅ FIXED: Now safely passes undefined
        existingUser.email = normalizedEmail;
        existingUser.phoneNumber = normalizedPhoneNumber;
        existingUser.role = role || "student";
        await existingUser.save();
        res
          .status(200)
          .json({
            success: true,
            message: "User registered successfully",
            user: existingUser,
          });
        return;
      } else {
        res
          .status(200)
          .json({
            success: true,
            message: "User already registered",
            user: existingUser,
          });
        return;
      }
    }

    if (email) {
      const existingEmail = await User.findOne({
        email: email.toLowerCase().trim(),
      });
      if (existingEmail) {
        res
          .status(400)
          .json({ success: false, message: "Email is already in use" });
        return;
      }
    }

    if (phoneNumber) {
      const existingPhone = await User.findOne({
        phoneNumber: phoneNumber.trim(),
      });
      if (existingPhone) {
        res
          .status(400)
          .json({ success: false, message: "Phone number is already in use" });
        return;
      }
    }

    const user = new User({
      uid,
      firstName: firstName.trim(),
      lastName: normalizedLastName, // ✅ FIXED: Now safely passes undefined
      email: normalizedEmail,
      phoneNumber: normalizedPhoneNumber,
      role: role || "student",
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user,
    });
  } catch (error: any) {
    console.error("Error registering user:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      res
        .status(400)
        .json({ success: false, message: `${field} is already in use` });
      return;
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err: any) => err.message,
      );
      res.status(400).json({ success: false, message: messages.join(", ") });
      return;
    }
    res
      .status(500)
      .json({
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
    res.status(200).json({ success: true, user: req.user });
  } catch (error: any) {
    console.error("Get profile error:", error);
    res
      .status(500)
      .json({
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
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    res
      .status(200)
      .json({ success: true, message: "Token is valid", user: req.user });
  } catch (error: any) {
    console.error("Verify token error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
};

// ✅ FIX: Correct backend controller for checking if user exists
export const checkUserExists = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { emailOrPhone } = req.body;
    if (!emailOrPhone) {
      res
        .status(400)
        .json({ success: false, message: "Email or Phone is required" });
      return;
    }

    const isEmail = /\S+@\S+\.\S+/.test(emailOrPhone);

    let user;
    if (isEmail) {
      user = await User.findOne({ email: emailOrPhone.toLowerCase().trim() });
    } else {
      user = await User.findOne({ phoneNumber: emailOrPhone.trim() });
    }

    res.status(200).json({ exists: !!user });
  } catch (error: any) {
    console.error("Error checking user:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Failed to check user status",
      });
  }
};

// Login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
      return;
    }

    try {
      // @ts-expect-error — not part of Admin Auth typings
      const userCredential = await auth.signInWithEmailAndPassword(
        email,
        password,
      );
      const userRecord = userCredential.user;

      if (!userRecord) {
        res
          .status(401)
          .json({ success: false, message: "Authentication failed" });
        return;
      }

      let user = await User.findOne({ uid: userRecord.uid });
      if (!user) {
        user = await User.create({
          uid: userRecord.uid,
          email: userRecord.email,
          firstName: "User",
          // ✅ FIXED: Removed lastName: "" completely to prevent Mongoose crash
          role: "student",
        });
      }

      res
        .status(200)
        .json({ success: true, message: "Login successful", user });
    } catch (firebaseError: any) {
      console.error("Firebase auth error:", firebaseError);
      let message = "Invalid email or password";
      if (firebaseError.code === "auth/user-not-found")
        message = "User not found";
      else if (firebaseError.code === "auth/wrong-password")
        message = "Incorrect password";
      else if (firebaseError.code === "auth/too-many-requests")
        message = "Too many failed attempts. Please try again later";
      res.status(401).json({ success: false, message });
    }
  } catch (error: any) {
    console.error("Login error:", error);
    res
      .status(500)
      .json({ success: false, message: error.message || "Login failed" });
  }
};

export const getAllUsers = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const users = await User.find({}).select("-__v");
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Failed to fetch users",
      });
  }
};

export const getUserById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    if (req.user?.role !== "admin" && req.user?.uid !== id) {
      res
        .status(403)
        .json({
          success: false,
          message: "Access denied. You can only view your own profile.",
        });
      return;
    }
    const user = await User.findOne({ uid: id }).select("-__v");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    res.status(200).json({ success: true, user });
  } catch (error: any) {
    console.error("Error fetching user:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Failed to fetch user",
      });
  }
};
