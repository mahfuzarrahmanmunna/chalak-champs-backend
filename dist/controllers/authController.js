"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = exports.getAllUsers = exports.login = exports.verifyToken = exports.getProfile = exports.register = exports.verifyEmailCode = exports.sendEmailVerification = exports.verifyPhoneCode = exports.sendPhoneVerification = void 0;
const firebase_1 = require("../config/firebase");
const User_1 = __importDefault(require("../models/User"));
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
        // FIX: Call the "Send" utility, not the "Verify" utility
        const result = await (0, phoneService_1.sendPhoneVerification)(phoneNumber);
        res.status(200).json({
            success: true,
            message: result.message || "Verification code sent successfully",
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
        const result = await (0, phoneService_1.verifyPhoneCodeUtil)(phoneNumber, code);
        if (result.success) {
            res.status(200).json({
                success: true,
                message: "Phone number verified successfully",
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
        const result = await (0, emailService_1.sendVerificationEmail)(email);
        res.status(200).json({
            success: true,
            message: result.message || "Verification code sent to your email",
        });
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
const register = async (req, res) => {
    try {
        const { uid, firstName, lastName, email, phoneNumber, role } = req.body;
        if (!uid || !firstName) {
            res.status(400).json({
                success: false,
                message: "Required fields are missing",
            });
            return;
        }
        // Normalize optional fields
        const normalizedLastName = lastName?.trim() || "";
        const normalizedEmail = email?.toLowerCase().trim() || undefined;
        const normalizedPhoneNumber = phoneNumber?.trim() || undefined;
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ uid });
        if (existingUser) {
            // If the user was auto-provisioned (has default firstName "User"), update with registration data
            if (existingUser.firstName === "User") {
                existingUser.firstName = firstName.trim();
                existingUser.lastName = normalizedLastName;
                existingUser.email = normalizedEmail;
                existingUser.phoneNumber = normalizedPhoneNumber;
                existingUser.role = role || "student";
                await existingUser.save();
                res.status(200).json({
                    success: true,
                    message: "User registered successfully",
                    user: {
                        uid: existingUser.uid,
                        firstName: existingUser.firstName,
                        lastName: existingUser.lastName,
                        email: existingUser.email,
                        phoneNumber: existingUser.phoneNumber,
                        role: existingUser.role,
                    },
                });
                return;
            }
            else {
                // User is already fully registered
                res.status(200).json({
                    success: true,
                    message: "User already registered",
                    user: {
                        uid: existingUser.uid,
                        firstName: existingUser.firstName,
                        lastName: existingUser.lastName,
                        email: existingUser.email,
                        phoneNumber: existingUser.phoneNumber,
                        role: existingUser.role,
                    },
                });
                return;
            }
        }
        // Check email uniqueness
        if (email) {
            const existingEmail = await User_1.default.findOne({
                email: email.toLowerCase().trim(),
            });
            if (existingEmail) {
                res.status(400).json({
                    success: false,
                    message: "Email is already in use",
                });
                return;
            }
        }
        // Check phone uniqueness
        if (phoneNumber) {
            const existingPhone = await User_1.default.findOne({
                phoneNumber: phoneNumber.trim(),
            });
            if (existingPhone) {
                res.status(400).json({
                    success: false,
                    message: "Phone number is already in use",
                });
                return;
            }
        }
        // Create new user
        const user = new User_1.default({
            uid,
            firstName: firstName.trim(),
            lastName: normalizedLastName,
            email: normalizedEmail,
            phoneNumber: normalizedPhoneNumber,
            role: role || "student",
        });
        await user.save();
        // Send verification emails/SMS if needed
        // FIX: Use the correct "Send" functions
        if (email) {
            await (0, emailService_1.sendVerificationEmail)(email);
        }
        if (phoneNumber) {
            await (0, phoneService_1.sendPhoneVerification)(phoneNumber);
        }
        res.status(201).json({
            success: true,
            message: "User registered successfully",
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
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            res.status(400).json({
                success: false,
                message: `${field} is already in use`,
            });
            return;
        }
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
        // Middleware handles validation
        if (!req.user) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Token is valid",
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
        console.error("Verify token error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
};
exports.verifyToken = verifyToken;
// Login
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
            // Using Admin SDK to verify credentials
            const userCredential = await firebase_1.auth.signInWithEmailAndPassword(email, password);
            const userRecord = userCredential.user;
            if (!userRecord) {
                res.status(401).json({
                    success: false,
                    message: "Authentication failed",
                });
                return;
            }
            // Check/Create user in our DB
            let user = await User_1.default.findOne({ uid: userRecord.uid });
            if (!user) {
                // Auto-provision if not exists (similar to middleware)
                user = await User_1.default.create({
                    uid: userRecord.uid,
                    email: userRecord.email,
                    firstName: "User", // Default, as we don't have name from Admin SDK login
                    lastName: "",
                    role: "student",
                });
            }
            // Frontend should get token using:
            // const result = await signInWithEmailAndPassword(email, password);
            // const token = await result.user.getIdToken();
            res.status(200).json({
                success: true,
                message: "Login successful",
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
const getAllUsers = async (req, res) => {
    try {
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
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
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
