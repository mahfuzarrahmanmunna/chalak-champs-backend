"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.getUserById = exports.getAllUsers = exports.verifyToken = exports.getProfile = exports.register = exports.verifyEmailCode = exports.sendEmailVerification = exports.verifyPhoneCode = exports.sendPhoneVerification = void 0;
const firebase_1 = require("../config/firebase");
const User_1 = __importDefault(require("../models/User"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const emailService_1 = require("../utils/emailService");
const phoneService_1 = require("../utils/phoneService");
// Send verification code for phone number
const sendPhoneVerification = async (req, res) => {
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
    }
    catch (error) {
        console.error("Error sending phone verification:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to send verification code",
        });
    }
};
exports.sendPhoneVerification = sendPhoneVerification;
// Verify phone number code
const verifyPhoneCode = async (req, res) => {
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
        const result = await (0, phoneService_1.verifyPhoneCodeUtil)(phoneNumber, code);
        if (result.success && result.user) {
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({ uid: result.user.uid, email: result.user.email }, process.env.JWT_SECRET || "default_secret", { expiresIn: "7d" });
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
        }
        else {
            res.status(400).json({
                success: false,
                message: result.message || "Invalid verification code",
            });
        }
    }
    catch (error) {
        console.error("Error verifying phone code:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to verify phone code",
        });
    }
};
exports.verifyPhoneCode = verifyPhoneCode;
// Send verification code for email
const sendEmailVerification = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ success: false, message: "Email is required" });
            return;
        }
        // Send verification email
        const result = await (0, emailService_1.sendVerificationEmail)(email);
        if (result.success) {
            res.status(200).json({
                success: true,
                message: "Verification code sent to your email",
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: result.message || "Failed to send verification email",
            });
        }
    }
    catch (error) {
        console.error("Error sending email verification:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to send verification email",
        });
    }
};
exports.sendEmailVerification = sendEmailVerification;
// Verify email code
const verifyEmailCode = async (req, res) => {
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
        const result = await (0, emailService_1.verifyEmailCode)(email, code);
        if (result.success) {
            res.status(200).json({
                success: true,
                message: "Email verified successfully",
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: result.message || "Invalid verification code",
            });
        }
    }
    catch (error) {
        console.error("Error verifying email code:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to verify email code",
        });
    }
};
exports.verifyEmailCode = verifyEmailCode;
// Register user
// Update the register function in authController.ts
const register = async (req, res) => {
    try {
        const { uid, firstName, lastName, email, phoneNumber, role } = req.body;
        if (!uid || !firstName || !lastName) {
            res
                .status(400)
                .json({ success: false, message: "Required fields are missing" });
            return;
        }
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ uid });
        if (existingUser) {
            res.status(400).json({ success: false, message: "User already exists" });
            return;
        }
        // Check if email is already in use (if provided)
        if (email) {
            const existingEmail = await User_1.default.findOne({
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
            const existingPhone = await User_1.default.findOne({
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
        const user = new User_1.default({
            uid,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email?.toLowerCase().trim() || undefined, // Use undefined instead of null
            phoneNumber: phoneNumber?.trim() || undefined, // Use undefined instead of null
            role: role || "student",
        });
        await user.save();
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ uid: user.uid, email: user.email }, process.env.JWT_SECRET || "default_secret", { expiresIn: "7d" });
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
    }
    catch (error) {
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
            const messages = Object.values(error.errors).map((err) => err.message);
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
exports.register = register;
// Get user profile
const getProfile = async (req, res) => {
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
    }
    catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
};
exports.getProfile = getProfile;
// Verify token
const verifyToken = async (req, res) => {
    try {
        // For POST requests, the token is in the request body
        // For GET requests, the user is already authenticated via middleware
        let user = req.user;
        if (!user && req.body.token) {
            // If no user from middleware, verify the token from the body
            try {
                const decodedToken = jsonwebtoken_1.default.verify(req.body.token, process.env.JWT_SECRET || "default_secret");
                const user = await User_1.default.findOne({ uid: decodedToken.uid });
                if (!user) {
                    res.status(401).json({ success: false, message: "User not found" });
                    return;
                }
            }
            catch (tokenError) {
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
    }
    catch (error) {
        console.error("Verify token error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
};
exports.verifyToken = verifyToken;
const getAllUsers = async (req, res) => {
    try {
        // Only allow admins to get all users
        // if (req.user?.role !== "admin") {
        //   res.status(403).json({
        //     success: false,
        //     message: "Access denied. Admin role required.",
        //   });
        //   return;
        // }
        const users = await User_1.default.find({}).select("-__v");
        res.status(200).json({
            success: true,
            count: users.length,
            users,
        });
    }
    catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch users",
        });
    }
};
exports.getAllUsers = getAllUsers;
// Get single user by ID
const getUserById = async (req, res) => {
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
        const user = await User_1.default.findOne({ uid: id }).select("-__v");
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
    }
    catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch user",
        });
    }
};
exports.getUserById = getUserById;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
            return;
        }
        try {
            const userCredential = await firebase_1.auth.signInWithEmailAndPassword(email, password);
            const userRecord = userCredential.user;
            if (!userRecord) {
                res.status(401).json({
                    success: false,
                    message: "Authentication failed",
                });
                return;
            }
            // Get user from our database
            const user = await User_1.default.findOne({ uid: userRecord.uid });
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: "User not found in our system",
                });
                return;
            }
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({ uid: user.uid, email: user.email }, process.env.JWT_SECRET || "default_secret", { expiresIn: "7d" });
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
        }
        catch (firebaseError) {
            console.error("Firebase auth error:", firebaseError);
            // Handle specific Firebase errors
            let message = "Invalid email or password";
            if (firebaseError.code === "auth/user-not-found") {
                message = "User not found";
            }
            else if (firebaseError.code === "auth/wrong-password") {
                message = "Incorrect password";
            }
            else if (firebaseError.code === "auth/too-many-requests") {
                message = "Too many failed attempts. Please try again later";
            }
            res.status(401).json({
                success: false,
                message,
            });
        }
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Login failed",
        });
    }
};
exports.login = login;
