"use strict";
// src/utils/phoneService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPhoneCodeUtil = exports.sendPhoneVerification = void 0;
const User_1 = __importDefault(require("../models/User"));
// In-memory storage for verification codes (in production, use Redis or a database)
const phoneVerificationCodes = {};
// Generate a 6-digit verification code
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
// Send verification code to phone number
const sendPhoneVerification = async (phoneNumber) => {
    try {
        // Generate a verification code
        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Code expires in 10 minutes
        // Store the code with expiration
        phoneVerificationCodes[phoneNumber] = { code, expiresAt };
        // In a real app, you would use a service like Twilio to send SMS
        // For now, we'll just log the code (in production, remove this)
        console.log(`Verification code for ${phoneNumber}: ${code}`);
        // TODO: Integrate with SMS service like Twilio
        // const twilio = require('twilio')(accountSid, authToken);
        // await twilio.messages.create({
        //   body: `Your verification code is: ${code}`,
        //   from: '+1234567890', // Your Twilio phone number
        //   to: phoneNumber
        // });
        return { success: true };
    }
    catch (error) {
        console.error("Error sending phone verification:", error);
        return { success: false, message: "Failed to send verification code" };
    }
};
exports.sendPhoneVerification = sendPhoneVerification;
// Verify phone number code
const verifyPhoneCodeUtil = async (phoneNumber, code) => {
    try {
        // Check if verification code exists for this phone number
        const storedData = phoneVerificationCodes[phoneNumber];
        if (!storedData) {
            return {
                success: false,
                message: "No verification code found for this phone number",
            };
        }
        // Check if code has expired
        if (new Date() > storedData.expiresAt) {
            // Remove expired code
            delete phoneVerificationCodes[phoneNumber];
            return { success: false, message: "Verification code has expired" };
        }
        // Check if code matches
        if (storedData.code !== code) {
            return { success: false, message: "Invalid verification code" };
        }
        // Remove verified code
        delete phoneVerificationCodes[phoneNumber];
        // Find user by phone number
        const user = await User_1.default.findOne({ phoneNumber });
        if (!user) {
            return {
                success: false,
                message: "User not found with this phone number",
            };
        }
        return { success: true, user };
    }
    catch (error) {
        console.error("Error verifying phone code:", error);
        return { success: false, message: "Failed to verify phone code" };
    }
};
exports.verifyPhoneCodeUtil = verifyPhoneCodeUtil;
