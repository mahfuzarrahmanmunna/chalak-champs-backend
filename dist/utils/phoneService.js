"use strict";
// src/utils/phoneService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPhoneCodeUtil = exports.sendPhoneVerification = void 0;
const crypto_1 = __importDefault(require("crypto"));
// ==================== CONFIGURATION ====================
const EASYSMS_API_KEY = process.env.EASYSYS_API_KEY || process.env.EASY_SMS || "";
const EASYSMS_API_URL = process.env.EASYSMS_API_URL || "https://api.easysms.xyz/api/sms-api/send";
const EASYSMS_SENDER_ID = process.env.EASYSMS_SENDER_ID || "";
// Rate-limit / OTP config
const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_RESENDS_PER_WINDOW = 3;
const MAX_VERIFY_ATTEMPTS = 5;
const SMS_REQUEST_TIMEOUT_MS = 10000;
// ==================== IN-MEMORY STORAGE ====================
const phoneVerificationCodes = {};
// ==================== PHONE NORMALIZATION ====================
const normalizeBangladeshPhone = (rawPhone) => {
    const cleaned = rawPhone.replace(/\D/g, "");
    let normalized = cleaned;
    if (normalized.startsWith("00880")) {
        normalized = "0" + normalized.slice(5);
    }
    else if (normalized.startsWith("880")) {
        normalized = "0" + normalized.slice(3);
    }
    if (!/^01[3-9]\d{8}$/.test(normalized)) {
        return null;
    }
    return normalized;
};
// ==================== OTP GENERATION ====================
const generateVerificationCode = () => {
    return crypto_1.default.randomInt(100000, 1000000).toString();
};
// ==================== EASYSMS API ====================
const sendSmsViaEasySms = async (phoneNumber, message) => {
    if (!EASYSMS_API_KEY) {
        console.error("[EasySMS] Missing EASYSMS_API_KEY env variable");
        return {
            success: false,
            message: "SMS service not configured",
            statusCode: 503,
        };
    }
    if (!EASYSMS_API_URL) {
        console.error("[EasySMS] Missing EASYSMS_API_URL env variable");
        return {
            success: false,
            message: "SMS service not configured",
            statusCode: 503,
        };
    }
    // Build request body — includes sender_id to avoid "SMS config not found"
    const smsBody = {
        phone: phoneNumber,
        message: message,
        type: "text",
    };
    // sender_id is REQUIRED by EasySMS — without it you get 404 "SMS config not found"
    if (EASYSMS_SENDER_ID) {
        smsBody.sender_id = EASYSMS_SENDER_ID;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SMS_REQUEST_TIMEOUT_MS);
    try {
        console.log("[EasySMS] Sending SMS:", {
            url: EASYSMS_API_URL,
            phone: phoneNumber,
            sender_id: EASYSMS_SENDER_ID || "(not set)",
        });
        const response = await fetch(EASYSMS_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${EASYSMS_API_KEY}`,
            },
            body: JSON.stringify(smsBody),
            signal: controller.signal,
        });
        const responseBody = await response.json();
        if (!response.ok || !responseBody.success) {
            const errMsg = responseBody?.error?.message ||
                responseBody?.message ||
                "SMS delivery failed";
            console.error("[EasySMS] Delivery failed:", {
                status: response.status,
                body: responseBody,
                message: errMsg,
            });
            // Provide a more helpful error message for the "config not found" case
            if (response.status === 404 ||
                /config not found/i.test(errMsg)) {
                return {
                    success: false,
                    message: "SMS sender configuration not found. Please set EASYSMS_SENDER_ID in your environment variables and verify it in your EasySMS dashboard.",
                    statusCode: 503,
                };
            }
            return {
                success: false,
                message: typeof errMsg === "string" ? errMsg : "SMS delivery failed",
                statusCode: response.status || 503,
            };
        }
        console.log("[EasySMS] SMS sent successfully");
        return { success: true };
    }
    catch (error) {
        if (error.name === "AbortError") {
            console.error(`[EasySMS] Request timed out after ${SMS_REQUEST_TIMEOUT_MS}ms`);
            return { success: false, message: "SMS service timed out" };
        }
        console.error("[EasySMS] Request failed:", {
            message: error.message,
            code: error.code,
            cause: error.cause?.message || error.cause,
            urlUsed: EASYSMS_API_URL,
        });
        return {
            success: false,
            message: "Failed to connect to SMS service",
            statusCode: 503,
        };
    }
    finally {
        clearTimeout(timeout);
    }
};
// ==================== SEND PHONE VERIFICATION ====================
const sendPhoneVerification = async (phoneNumber) => {
    try {
        const normalizedPhone = normalizeBangladeshPhone(phoneNumber);
        if (!normalizedPhone) {
            return {
                success: false,
                message: "Invalid phone number. Please enter a valid Bangladesh mobile number.",
                statusCode: 400,
            };
        }
        const existing = phoneVerificationCodes[normalizedPhone];
        const now = new Date();
        if (existing && now <= existing.expiresAt) {
            const secondsSinceLastSent = Math.floor((now.getTime() - existing.lastSentAt.getTime()) / 1000);
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
        }
        else if (existing) {
            delete phoneVerificationCodes[normalizedPhone];
        }
        const code = generateVerificationCode();
        const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
        const message = `Your OTP for Chalak Champs is ${code}. It will expire in ${OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`;
        const smsResult = await sendSmsViaEasySms(normalizedPhone, message);
        if (!smsResult.success) {
            return {
                success: false,
                message: smsResult.message || "Failed to send verification code",
                statusCode: smsResult.statusCode || 503,
            };
        }
        const prevResendCount = existing && now <= existing.expiresAt ? existing.resendCount : 0;
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
    }
    catch (error) {
        console.error("[phoneService] sendPhoneVerification error:", error.message);
        return {
            success: false,
            message: "Failed to send verification code",
        };
    }
};
exports.sendPhoneVerification = sendPhoneVerification;
// ==================== VERIFY PHONE CODE ====================
const verifyPhoneCodeUtil = async (phoneNumber, code) => {
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
        return {
            success: true,
            message: "Phone number verified successfully",
        };
    }
    catch (error) {
        console.error("[phoneService] verifyPhoneCodeUtil error:", error.message);
        return { success: false, message: "Failed to verify phone code" };
    }
};
exports.verifyPhoneCodeUtil = verifyPhoneCodeUtil;
