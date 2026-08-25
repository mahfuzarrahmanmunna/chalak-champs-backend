// src/utils/phoneService.ts

import crypto from "crypto";
import User from "../models/User";

// ==================== TYPES ====================

interface VerificationEntry {
  code: string;
  expiresAt: Date;
  lastSentAt: Date;
  verifyAttempts: number;
  resendCount: number;
}

interface SmsServiceResult {
  success: boolean;
  message?: string;
}

interface VerifyResult {
  success: boolean;
  message?: string;
  user?: any;
}

// ==================== CONFIGURATION ====================

const EASYSMS_API_KEY = process.env.EASYSMS_API_KEY || process.env.EASY_SMS || "";
const EASYSMS_API_URL = process.env.EASYSMS_API_URL || "https://api.easysms.xyz/api/sms-api/send";

// Rate-limit / OTP config
const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_RESENDS_PER_WINDOW = 3;
const MAX_VERIFY_ATTEMPTS = 5;
const SMS_REQUEST_TIMEOUT_MS = 10_000;

// ==================== IN-MEMORY STORAGE ====================

const phoneVerificationCodes: Record<string, VerificationEntry> = {};

// ==================== PHONE NORMALIZATION ====================

/**
 * Normalizes a Bangladesh phone number to local format: 01XXXXXXXXX
 * Accepts: 01XXXXXXXXX | +8801XXXXXXXXX | 8801XXXXXXXXX | 008801XXXXXXXXX
 */
const normalizeBangladeshPhone = (rawPhone: string): string | null => {
  const cleaned = rawPhone.replace(/\D/g, "");

  let normalized = cleaned;
  if (normalized.startsWith("00880")) {
    normalized = "0" + normalized.slice(5);
  } else if (normalized.startsWith("880")) {
    normalized = "0" + normalized.slice(3);
  }

  if (!/^01[3-9]\d{8}$/.test(normalized)) {
    return null;
  }

  return normalized;
};

// ==================== OTP GENERATION ====================

const generateVerificationCode = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

// ==================== EASYSMS API ====================


const sendSmsViaEasySms = async (
  phoneNumber: string,
  message: string,
): Promise<SmsServiceResult> => {
  if (!EASYSMS_API_KEY) {
    console.error("[EasySMS] Missing EASYSMS_API_KEY env variable");
    return { success: false, message: "SMS service not configured" };
  }

  if (!EASYSMS_API_URL) {
    console.error("[EasySMS] Missing EASYSMS_API_URL env variable");
    return { success: false, message: "SMS service not configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SMS_REQUEST_TIMEOUT_MS);

  try {
    console.log(`[EasySMS] Attempting to send to: ${EASYSMS_API_URL}`); // Log URL

    const response = await fetch(EASYSMS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${EASYSMS_API_KEY}`,
      },
      body: JSON.stringify({
        phone: phoneNumber,
        message,
      }),
      signal: controller.signal,
    });

    const responseBody: any = await response.json();

    if (!response.ok || !responseBody.success) {
      const errMsg = responseBody?.error?.message || "SMS delivery failed";
      console.error("[EasySMS] Delivery failed:", errMsg);
      return {
        success: false,
        message: typeof errMsg === "string" ? errMsg : "SMS delivery failed",
      };
    }

    return { success: true };
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error(`[EasySMS] Request timed out after ${SMS_REQUEST_TIMEOUT_MS}ms`);
      return { success: false, message: "SMS service timed out" };
    }

    // Enhanced error logging to see the exact cause
    console.error("[EasySMS] Request failed:", {
      message: error.message,
      code: error.code,
      cause: error.cause?.message || error.cause,
      urlUsed: EASYSMS_API_URL
    });

    return {
      success: false,
      message: "Failed to connect to SMS service",
    };
  } finally {
    clearTimeout(timeout);
  }
};

// ==================== SEND PHONE VERIFICATION ====================

export const sendPhoneVerification = async (
  phoneNumber: string,
): Promise<SmsServiceResult> => {
  try {
    const normalizedPhone = normalizeBangladeshPhone(phoneNumber);

    if (!normalizedPhone) {
      return {
        success: false,
        message: "Invalid phone number. Please enter a valid Bangladesh mobile number.",
      };
    }

    const existing = phoneVerificationCodes[normalizedPhone];
    const now = new Date();

    if (existing && now <= existing.expiresAt) {
      const secondsSinceLastSent = Math.floor(
        (now.getTime() - existing.lastSentAt.getTime()) / 1000,
      );

      if (secondsSinceLastSent < RESEND_COOLDOWN_SECONDS) {
        const wait = RESEND_COOLDOWN_SECONDS - secondsSinceLastSent;
        return {
          success: false,
          message: `Please wait ${wait} second(s) before requesting a new code.`,
        };
      }

      if (existing.resendCount >= MAX_RESENDS_PER_WINDOW) {
        return {
          success: false,
          message: "Too many OTP requests. Please try again after some time.",
        };
      }
    } else if (existing) {
      delete phoneVerificationCodes[normalizedPhone];
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const message = `Your OTP for Chalak Champs is ${code}.`;

    const smsResult = await sendSmsViaEasySms(normalizedPhone, message);

    if (!smsResult.success) {
      return {
        success: false,
        message: smsResult.message || "Failed to send verification code",
      };
    }

    const prevResendCount =
      existing && now <= existing.expiresAt ? existing.resendCount : 0;

    phoneVerificationCodes[normalizedPhone] = {
      code,
      expiresAt,
      lastSentAt: now,
      verifyAttempts: 0,
      resendCount: prevResendCount + 1,
    };

    return {
      success: true,
      message: "Verification code sent successfully",
    };
  } catch (error: any) {
    console.error("[phoneService] sendPhoneVerification error:", error.message);
    return {
      success: false,
      message: "Failed to send verification code",
    };
  }
};

// ==================== VERIFY PHONE CODE ====================

export const verifyPhoneCodeUtil = async (
  phoneNumber: string,
  code: string,
): Promise<VerifyResult> => {
  try {
    const normalizedPhone = normalizeBangladeshPhone(phoneNumber);

    if (!normalizedPhone) {
      return { success: false, message: "Invalid phone number format" };
    }

    const storedData = phoneVerificationCodes[normalizedPhone];

    if (!storedData) {
      return {
        success: false,
        message: "No verification code found for this phone number",
      };
    }

    if (new Date() > storedData.expiresAt) {
      delete phoneVerificationCodes[normalizedPhone];
      return { success: false, message: "Verification code has expired" };
    }

    if (storedData.verifyAttempts >= MAX_VERIFY_ATTEMPTS) {
      delete phoneVerificationCodes[normalizedPhone];
      return {
        success: false,
        message: "Too many failed attempts. Please request a new code.",
      };
    }

    if (storedData.code !== code) {
      storedData.verifyAttempts += 1;
      return { success: false, message: "Invalid verification code" };
    }

    // Success — remove used OTP
    delete phoneVerificationCodes[normalizedPhone];

    // REMOVED: User.findOne check. 
    // We only need to verify the code is correct here. 
    // The frontend will handle whether to log them in or ask for their name.

    return {
      success: true,
      message: "Phone number verified successfully",
    };
  } catch (error: any) {
    console.error("[phoneService] verifyPhoneCodeUtil error:", error.message);
    return { success: false, message: "Failed to verify phone code" };
  }
};