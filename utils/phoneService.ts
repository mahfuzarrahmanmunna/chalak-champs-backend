// Mock implementation for Phone Service

const phoneOtpStore: Record<string, string> = {};

const generate4DigitCode = (): string => {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  return code.slice(0, 4);
};

export const sendPhoneVerification = async (
  phoneNumber: string,
): Promise<{ success: boolean; message: string }> => {
  const code = generate4DigitCode();

  phoneOtpStore[phoneNumber] = code;

  console.log(
    `[Phone Service] MOCK: Sending 4-digit code ${code} to ${phoneNumber}`,
  );
  console.log(`[Phone Service] Note: Use code: ${code}`);

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: "Verification code sent successfully",
      });
    }, 500);
  });
};

export const verifyPhoneCodeUtil = async (
  phoneNumber: string,
  code: string,
): Promise<{ success: boolean; message?: string; user?: any }> => {
  console.log(`[Phone Service] Verifying code for ${phoneNumber}: ${code}`);

  const storedCode = phoneOtpStore[phoneNumber];

  const isValid = storedCode === code && code.length === 4;

  if (isValid) {
    delete phoneOtpStore[phoneNumber];
    return { success: true, message: "Phone number verified successfully" };
  }

  return { success: false, message: "Invalid or expired verification code" };
};
