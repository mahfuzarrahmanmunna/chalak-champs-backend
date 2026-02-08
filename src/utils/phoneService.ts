// src/utils/phoneService.ts

import crypto from "crypto";
import User from "../models/User";

// In-memory storage for verification codes (in production, use Redis or a database)
const phoneVerificationCodes: Record<
  string,
  { code: string; expiresAt: Date }
> = {};

// Generate a 6-digit verification code
const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification code to phone number
export const sendPhoneVerification = async (
  phoneNumber: string,
): Promise<{ success: boolean; message?: string }> => {
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
  } catch (error) {
    console.error("Error sending phone verification:", error);
    return { success: false, message: "Failed to send verification code" };
  }
};

// Verify phone number code
export const verifyPhoneCodeUtil = async (
  phoneNumber: string,
  code: string,
): Promise<{ success: boolean; message?: string; user?: any }> => {
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
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return {
        success: false,
        message: "User not found with this phone number",
      };
    }

    return { success: true, user };
  } catch (error) {
    console.error("Error verifying phone code:", error);
    return { success: false, message: "Failed to verify phone code" };
  }
};
