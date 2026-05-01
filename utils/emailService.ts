// Mock implementation for Email Service

// Simple in-memory storage for demo purposes (In real app, use Database or Redis)
const emailOtpStore: Record<string, string> = {};

// Helper to strictly ensure 4 digits
const generate4DigitCode = (): string => {
  // Generates a number between 1000 and 9999
  // Math.floor ensures it is an integer, .toString() converts to string
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  console.log(code)

  // Extra safety: slice to first 4 characters if somehow longer
  return code.slice(0, 4);
};

export const sendVerificationEmail = async (
  email: string,
): Promise<{ success: boolean; message: string }> => {
  const code = generate4DigitCode();

  // Store the code
  emailOtpStore[email] = code;

  console.log(`[Email Service] MOCK: Sending 4-digit code ${code} to ${email}`);
  console.log(`[Email Service] Note: Use code: ${code}`);

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: "Verification code sent successfully",
      });
    }, 500);
  });
};

export const verifyEmailCodeUtil = async (
  email: string,
  code: string,
): Promise<{ success: boolean; message?: string; user?: any }> => {
  console.log(`[Email Service] Verifying code for ${email}: ${code}`);

  const storedCode = emailOtpStore[email];

  // Validation: Check match AND ensure input code is exactly 4 digits
  const isValid = storedCode === code && code.length === 4;

  if (isValid) {
    delete emailOtpStore[email];
    return { success: true, message: "Email verified successfully" };
  }

  return { success: false, message: "Invalid or expired verification code" };
};
