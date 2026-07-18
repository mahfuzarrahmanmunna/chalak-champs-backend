import express from "express";
import { google } from "googleapis";
import nodemailer from "nodemailer";

const router = express.Router();

// --- 1. Google Sheets Helper Function ---
const appendToSheet = async (data: any) => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_CREDENTIALS_PATH,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Map incoming data to columns (Ensure this order matches your Google Sheet headers)
    const values = [
      [
        new Date().toISOString(),
        data.fullName,
        data.email,
        data.phone,
        data.companyName,
        data.city,
        data.address,
        data.preferredLanguage,
        data.inquiryType,
        data.subject,
        data.message,
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "Sheet1!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values,
      },
    });
  } catch (error) {
    console.error("Google Sheets Error:", error);
    throw new Error("Failed to save to sheet");
  }
};

// --- 2. Email Helper Function with Modern Design ---
const sendEmails = async (data: any) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // --- Design Variables ---
    const primaryColor = "#F3066E"; // Pink
    const secondaryColor = "#214187"; // Blue
    const gradientBg = `linear-gradient(135deg, ${primaryColor} 60%, ${secondaryColor} 100%)`;

    // --- HTML Template for User (Greeting) ---
    const mailToUserHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <div style="background: ${gradientBg}; padding: 40px 20px; text-align: center; color: white;">
            <div style="font-size: 48px; margin-bottom: 10px;">✉️</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Hello, ${data.fullName}!</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">We received your message</p>
          </div>

          <!-- Body -->
          <div style="padding: 40px 30px; color: #333333;">
            <p style="font-size: 16px; line-height: 1.6;">Thank you for contacting us. We have successfully received your inquiry regarding <strong>"${data.subject}"</strong>.</p>
            
            <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">
              Our team is currently reviewing your details and will get back to you at <strong>${data.email}</strong> within the next 24 hours.
            </p>

            <div style="text-align: center; margin: 40px 0;">
              <a href="https://chalakchamps.com" style="background-color: ${primaryColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; box-shadow: 0 4px 15px rgba(243, 6, 110, 0.3);">
                Visit Our Website
              </a>
            </div>

            <p style="font-size: 14px; color: #888888; border-top: 1px solid #eeeeee; padding-top: 20px; margin-top: 30px;">
              Best Regards,<br>
              <strong>The Team</strong>
            </p>
          </div>
        </div>
      </div>
    `;

    // --- HTML Template for Admin (New Student Info) ---
    const mailToAdminHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <div style="background: ${gradientBg}; padding: 30px 20px; color: white;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700;">🔔 New Student Inquiry</h1>
            <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">A new form has been submitted via the website.</p>
          </div>

          <!-- Body -->
          <div style="padding: 30px;">
            <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; border-left: 5px solid ${secondaryColor};">
              <p style="margin: 0 0 10px; font-size: 18px; font-weight: bold; color: ${secondaryColor}">${data.subject}</p>
              <p style="margin: 0; color: #666;">Received on: ${new Date().toLocaleString()}</p>
            </div>

            <table style="width: 100%; margin-top: 25px; border-collapse: collapse; font-size: 15px;">
              <tr>
                <td style="padding: 10px; color: #888; width: 30%;">Full Name</td>
                <td style="padding: 10px; font-weight: 600; color: #333;">${data.fullName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #888; width: 30%;">Email</td>
                <td style="padding: 10px; font-weight: 600; color: #333;">
                  <a href="mailto:${data.email}" style="color: ${primaryColor}; text-decoration: none;">${data.email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #888; width: 30%;">Phone</td>
                <td style="padding: 10px; font-weight: 600; color: #333;">${data.phone}</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #888; width: 30%;">Company</td>
                <td style="padding: 10px; font-weight: 600; color: #333;">${data.companyName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #888; width: 30%;">City</td>
                <td style="padding: 10px; font-weight: 600; color: #333;">${data.city}</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #888; width: 30%; vertical-align: top;">Message</td>
                <td style="padding: 10px; color: #555; line-height: 1.5;">${data.message}</td>
              </tr>
            </table>

             <div style="margin-top: 30px; text-align: center;">
                <a href="https://apichalakchamps.vercel.app/admin" style="display: inline-block; border: 1px solid #dddddd; padding: 10px 20px; text-decoration: none; border-radius: 6px; color: #555; font-size: 14px;">
                  View in Admin Panel
                </a>
            </div>
          </div>
        </div>
      </div>
    `;

    // --- Send Emails ---
    // 1. To Student
    await transporter.sendMail({
      from: `"Company Name" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject: "We received your message!",
      html: mailToUserHtml,
    });

    // 2. To Admin
    await transporter.sendMail({
      from: `"Website Bot" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `New Inquiry: ${data.subject}`,
      html: mailToAdminHtml,
    });
  } catch (error) {
    console.error("Email Error:", error);
    // Log error but don't crash the request
  }
};

// --- 3. Route Handler ---
router.post("/submit-sheet", async (req, res) => {
  try {
    const formData = req.body;

    // 1. Save to Google Sheet
    await appendToSheet(formData);

    // 2. Send Emails
    await sendEmails(formData);

    res.status(200).json({ message: "Success! Data saved and emails sent." });
  } catch (error) {
    console.error("Route Error:", error);
    res.status(500).json({ message: "Server Error processing request" });
  }
});

export default router;
