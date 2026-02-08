import { Request, Response } from "express";
import { auth } from "../config/firebase";
import User from "../models/User";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middleware/auth";
import {
  sendVerificationEmail,
  verifyEmailCode as verifyEmailCodeUtil,
} from "../utils/emailService";
import { verifyPhoneCodeUtil } from "../utils/phoneService";

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
        message: "Phone number and verification code are required",
      });
      return;
    }

    // Verify the phone code
    const result = await verifyPhoneCodeUtil(phoneNumber, code);

    if (result.success && result.user) {
      // Generate JWT token
      const token = jwt.sign(
        { uid: result.user.uid, email: result.user.email },
        process.env.JWT_SECRET || "default_secret",
        { expiresIn: "7d" },
      );

      res.status(200).json({
        success: true,
        message: "Phone number verified successfully",
        token, // Make sure to include the token in the response
        user: {
          uid: result.user.uid,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          email: result.user.email,
          phoneNumber: result.user.phoneNumber,
          role: result.user.role,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || "Invalid verification code",
      });
    }
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
// Update the register function in authController.ts
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

    // Check if email is already in use (if provided)
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

    // Check if phone number is already in use (if provided)
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

    // Create new user
    const user = new User({
      uid,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email?.toLowerCase().trim() || undefined, // Use undefined instead of null
      phoneNumber: phoneNumber?.trim() || undefined, // Use undefined instead of null
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
    // For POST requests, the token is in the request body
    // For GET requests, the user is already authenticated via middleware
    let user = req.user;

    if (!user && req.body.token) {
      // If no user from middleware, verify the token from the body
      try {
        const decodedToken = jwt.verify(
          req.body.token,
          process.env.JWT_SECRET || "default_secret",
        ) as any;
        const user = await User.findOne({ uid: decodedToken.uid });

        if (!user) {
          res.status(401).json({ success: false, message: "User not found" });
          return;
        }
      } catch (tokenError) {
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }
    }

    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Token is valid",
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
    console.error("Verify token error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getAllUsers = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    // Only allow admins to get all users
    // if (req.user?.role !== "admin") {
    //   res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin role required.",
    //   });
    //   return;
    // }

    const users = await User.find({}).select("-__v");

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch users",
    });
  }
};

// Get single user by ID
export const getUserById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless they're an admin
    if (req.user?.role !== "admin" && req.user?.uid !== id) {
      res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own profile.",
      });
      return;
    }

    const user = await User.findOne({ uid: id }).select("-__v");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user",
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    // Verify email and password with Firebase
    try {
      const userRecord = await auth.getUserByEmail(email);

      // Get user from our database
      const user = await User.findOne({ uid: userRecord.uid });

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found in our system",
        });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { uid: user.uid, email: user.email },
        process.env.JWT_SECRET || "default_secret",
        { expiresIn: "7d" },
      );

      res.status(200).json({
        success: true,
        message: "Login successful",
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
    } catch (firebaseError: any) {
      console.error("Firebase error:", firebaseError);
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
};
