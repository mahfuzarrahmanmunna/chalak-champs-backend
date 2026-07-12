"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailCode = exports.sendVerificationEmail = exports.generateVerificationCode = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
// In-memory storage for verification codes (in production, use Redis or a database)
const verificationCodes = {};
let transporterSingleton = null;
function getTransporter() {
    if (transporterSingleton)
        return transporterSingleton;
    const user = process.env.EMAIL_USER?.trim();
    const pass = process.env.EMAIL_PASS?.replace(/\s+/g, "");
    if (!user || !pass) {
        console.warn("EMAIL_USER or EMAIL_PASS not set. Using JSON transport (emails will not be sent).");
        transporterSingleton = nodemailer_1.default.createTransport({ jsonTransport: true });
        return transporterSingleton;
    }
    transporterSingleton = nodemailer_1.default.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
    });
    return transporterSingleton;
}
// Generate a 6-digit verification code
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.generateVerificationCode = generateVerificationCode;
// Send verification email
const sendVerificationEmail = async (email) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error("SMTP credentials not configured. Set EMAIL_USER and EMAIL_PASS in environment.");
            return { success: false, message: "SMTP credentials not configured" };
        }
        // Generate a verification code
        const code = (0, exports.generateVerificationCode)();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Code expires in 10 minutes
        // Store the code with expiration
        verificationCodes[email] = { code, expiresAt };
        // Create professional email HTML
        const emailHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 20px;
            text-align: center;
          }
          .content {
            padding: 30px;
          }
          .verification-code {
            background-color: #f8f9fa;
            border: 2px dashed #6366f1;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
          }
          .code {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 5px;
            color: #6366f1;
            margin: 10px 0;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
          }
          .button {
            display: inline-block;
            background-color: #6366f1;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            text-decoration: none;
            font-weight: bold;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Chalak Champs</h1>
            <p>Email Verification</p>
          </div>
          <div class="content">
            <h2>Hello,</h2>
            <p>Thank you for signing up for Chalak Champs! To complete your registration, please use the verification code below:</p>
            
            <div class="verification-code">
              <p>Your verification code is:</p>
              <div class="code">${code}</div>
              <p>This code will expire in 10 minutes.</p>
            </div>
            
            <p>If you didn't request this code, you can safely ignore this email.</p>
            
            <p>Best regards,<br>The Chalak Champs Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Chalak Champs. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
        // Send email
        await getTransporter().sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Chalak Champs - Email Verification",
            html: emailHTML,
        });
        return { success: true };
    }
    catch (error) {
        console.error("Error sending verification email:", error);
        return { success: false, message: "Failed to send verification email" };
    }
};
exports.sendVerificationEmail = sendVerificationEmail;
// Verify email code
const verifyEmailCode = async (email, code) => {
    try {
        // Check if verification code exists for this email
        const storedData = verificationCodes[email];
        if (!storedData) {
            return {
                success: false,
                message: "No verification code found for this email",
            };
        }
        // Check if code has expired
        if (new Date() > storedData.expiresAt) {
            // Remove expired code
            delete verificationCodes[email];
            return { success: false, message: "Verification code has expired" };
        }
        // Check if code matches
        if (storedData.code !== code) {
            return { success: false, message: "Invalid verification code" };
        }
        // Remove verified code
        delete verificationCodes[email];
        return { success: true };
    }
    catch (error) {
        console.error("Error verifying email code:", error);
        return { success: false, message: "Failed to verify email code" };
    }
};
exports.verifyEmailCode = verifyEmailCode;
