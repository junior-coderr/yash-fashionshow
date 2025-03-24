import nodemailer from "nodemailer";
import QRCode from "qrcode";
import CategoryCosts from "@/models/CategoryCosts";

/**
 * Email service for sending confirmation and notification emails
 */
const emailConfig = {
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
};

const transporter = nodemailer.createTransport(emailConfig);
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Send registration confirmation email
 * @param {Object} registration - Registration details including name, email, registrationId, etc.
 * @returns {Promise<boolean>} - Success status
 */
export async function sendRegistrationConfirmationEmail(registration) {
  try {
    const { name, email, registrationId, participationCategories, totalAmount } =
      registration;

    // Get formatted participation categories
    const categories = Object.entries(participationCategories)
      .filter(([_, selected]) => selected)
      .map(([category]) => {
        const formatted =
          category === "modelWalk"
            ? "Model Selection"
            : category === "movieSelection"
            ? "Movie Selection"
            : "Dance Selection";
        return formatted;
      })
      .join(", ");

    // Format registration date
    const registrationDate = new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const registrationUrl = `${appUrl}?registrationId=${registrationId}`;

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Registration Confirmation - Fashion Show Event",
      html: getRegistrationConfirmationTemplate({
        name,
        registrationId,
        categories,
        totalAmount,
        registrationDate,
        registrationUrl,
      }),
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Registration confirmation email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Failed to send registration confirmation email:", error);
    return false;
  }
}

/**
 * Send admin notification email about new registration
 * @param {Object} registration - Registration details
 * @returns {Promise<boolean>} - Success status
 */
export async function sendAdminNotificationEmail(registration) {
  try {
    const { name, email, registrationId, utrId, participationCategories, totalAmount } =
      registration;

    // Get formatted participation categories
    const categories = Object.entries(participationCategories)
      .filter(([_, selected]) => selected)
      .map(([category]) => {
        const formatted =
          category === "modelWalk"
            ? "Model Selection"
            : category === "movieSelection"
            ? "Movie Selection"
            : "Dance Selection";
        return formatted;
      })
      .join(", ");

    // Format registration date
    const registrationDate = new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: `New Fashion Show Registration - ${registrationId}`,
      html: getAdminNotificationTemplate({
        name,
        email,
        registrationId,
        utrId,
        categories,
        totalAmount,
        registrationDate,
      }),
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Admin notification email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Failed to send admin notification email:", error);
    return false;
  }
}

/**
 * Generate QR code as base64 string
 */
export async function generateQRCode(data) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    // If this is a registration ID for entry verification, create a verification URL
    if (data && data.registrationId) {
      // Create verification URL that points to the verification page
      const verifyUrl = `${appUrl}/verify/${data.registrationId}`;
      
      // Generate QR code for the verification URL
      const qrCode = await QRCode.toDataURL(verifyUrl, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 300,
      });
      return qrCode;
    } else {
      // For other use cases, use the old behavior
      const jsonString = JSON.stringify(data);
      const qrCode = await QRCode.toDataURL(jsonString, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 300,
      });
      return qrCode;
    }
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    return null;
  }
}

/**
 * Send payment status email
 * @param {Object} registration - Registration details including name, email, registrationId, paymentStatus, etc.
 * @returns {Promise<boolean>} - Success status
 */
export async function sendPaymentStatusEmail(registration) {
  try {
    const { name, email, registrationId, paymentStatus } = registration;
    const registrationUrl = `${appUrl}?registrationId=${registrationId}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Payment Status Update - Fashion Show Event`,
      html: getPaymentStatusTemplate({
        name,
        registrationId,
        status: paymentStatus,
        registrationUrl, // Pass the URL instead of QR code
      }),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Payment status email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Failed to send payment status email:", error);
    return false;
  }
}

/**
 * Send email verification OTP
 * @param {string} email - User's email address
 * @param {string} name - User's name
 * @param {string} otp - The generated OTP
 * @returns {Promise<boolean>} - Success status
 */
export async function sendEmailVerificationOTP(email, name, otp) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Email Verification - Fashion Show Event",
      html: getEmailVerificationTemplate({
        name,
        otp,
      }),
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email verification OTP sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Failed to send email verification OTP:", error);
    return false;
  }
}

/**
 * HTML template for registration confirmation email
 */
function getRegistrationConfirmationTemplate({
  name,
  registrationId,
  categories,
  totalAmount,
  registrationDate,
  registrationUrl,
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fashion Show Registration Confirmation</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f7f9fc;
        }
        .header {
          background: linear-gradient(135deg, #4f46e5, #8b5cf6);
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: white;
          padding: 20px;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .registration-details {
          background-color: #f0f4ff;
          border-left: 4px solid #4f46e5;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #4f46e5, #8b5cf6);
          color: white !important;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Registration Confirmation</h1>
        </div>
        <div class="content">
          <p>Dear ${name},</p>
          
          <p>Thank you for registering for the Fashion Show Event! We're excited to have you join us.</p>
          
          <div class="registration-details">
            <h3>Registration Details</h3>
            <p><strong>Registration ID:</strong> ${registrationId}</p>
            <p><strong>Event Categories:</strong> ${categories}</p>
            <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
            <p><strong>Registration Date:</strong> ${registrationDate}</p>
            <div style="margin-top: 15px; padding: 10px; background-color: #fff8e1; border: 1px solid #ffd54f; border-radius: 4px;">
              <p style="color: #b38f00; margin: 0; display: flex; align-items: center;">
                <span style="font-weight: bold;">Payment Status:</span>
                <span style="margin-left: 5px;">Pending Verification</span>
              </p>
              <p style="color: #b38f00; margin: 5px 0 0 0; font-size: 14px;">
                We will notify you via email once your payment is verified.
              </p>
            </div>
          </div>
          
          <p style="margin-top: 20px; padding: 12px; background-color: #e3f2fd; border-radius: 4px; color: #1565c0; font-size: 14px;">
            <strong>Note:</strong> Your registration payment is currently under verification. You will receive a confirmation email once the payment is verified.
          </p>
          
          <p>You can view your registration details at any time by clicking the button below:</p>
          
          <div style="text-align: center;">
            <a href="${registrationUrl}" style="color: white; text-decoration: none;">
              <div class="button">View Registration</div>
            </a>
          </div>

          <p>If you have any questions about your registration, please reply to this email or contact our support team.</p>
          
          <p>We look forward to seeing you at the event!</p>
          
          <p>Best regards,<br>Fashion Show Event Team</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Fashion Show Event. All rights reserved.</p>
          <p>For any queries, contact us at: support@fashionshow.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * HTML template for admin notification email
 */
function getAdminNotificationTemplate({
  name,
  email,
  registrationId,
  utrId,
  categories,
  totalAmount,
  registrationDate,
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Fashion Show Registration</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f7f9fc;
        }
        .header {
          background: linear-gradient(135deg, #4f46e5, #8b5cf6);
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: white;
          padding: 20px;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .registration-details {
          background-color: #f0f4ff;
          border-left: 4px solid #4f46e5;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>New Registration Alert</h1>
        </div>
        <div class="content">
          <p>A new registration has been completed for the Fashion Show Event.</p>
          
          <div class="registration-details">
            <h3>Registration Details</h3>
            <p><strong>Registration ID:</strong> ${registrationId}</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>UTR/Transaction ID:</strong> ${utrId}</p>
            <p><strong>Event Categories:</strong> ${categories}</p>
            <p><strong>Total Amount Paid:</strong> ₹${totalAmount}</p>
            <p><strong>Registration Date:</strong> ${registrationDate}</p>
          </div>
          
          <p>Please verify the payment and update the registration status.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Fashion Show Event. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * HTML template for payment status email
 */
function getPaymentStatusTemplate({
  name,
  registrationId,
  status,
  registrationUrl,
}) {
  const statusColor = status === "verified" ? "#15803d" : "#b91c1c";
  const statusMessage =
    status === "verified"
      ? "Your payment has been verified successfully."
      : "Your payment has been rejected. Please contact support for assistance.";

  // Replace QR code section with button to view ticket
  const viewTicketSection =
    status === "verified"
      ? `
    <div style="margin: 20px 0; text-align: center;">
      <p style="color: #15803d; margin-bottom: 15px;">Your entry ticket is ready!</p>
      <a href="${registrationUrl}" style="text-decoration: none;">
        <div style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #8b5cf6); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
          View Entry Ticket
        </div>
      </a>
      <p style="color: #374151; margin-top: 10px; font-size: 14px;">
        Click the button above to view your entry ticket with QR code.
      </p>
    </div>
    `
      : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Status Update</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f7f9fc;
        }
        .header {
          background: linear-gradient(135deg, #4f46e5, #8b5cf6);
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: white;
          padding: 20px;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Payment Status Update</h1>
        </div>
        <div class="content">
          <p>Dear ${name},</p>
          
          <p>We are writing to inform you about your registration (ID: ${registrationId}) for the Fashion Show Event.</p>
          
          <div style="margin: 20px 0; padding: 15px; background-color: ${
            status === "verified" ? "#f0fdf4" : "#fef2f2"
          }; border: 1px solid ${statusColor}; border-radius: 4px;">
            <p style="color: ${statusColor}; margin: 0; font-weight: bold;">${statusMessage}</p>
          </div>
          
          ${viewTicketSection}
          
          <p>If you have any questions, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>Fashion Show Event Team</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Fashion Show Event. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * HTML template for email verification OTP
 */
function getEmailVerificationTemplate({
  name,
  otp,
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f7f9fc;
        }
        .header {
          background: linear-gradient(135deg, #4f46e5, #8b5cf6);
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: white;
          padding: 20px;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .otp-container {
          background-color: #f0f4ff;
          border-left: 4px solid #4f46e5;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          text-align: center;
        }
        .otp-code {
          font-size: 28px;
          font-weight: bold;
          letter-spacing: 6px;
          color: #4f46e5;
          background-color: #e9ecfb;
          padding: 10px 20px;
          border-radius: 4px;
          display: inline-block;
          margin: 10px 0;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Email Verification</h1>
        </div>
        <div class="content">
          <p>Dear ${name},</p>
          
          <p>Thank you for registering for the Fashion Show Event. Please use the verification code below to verify your email address:</p>
          
          <div class="otp-container">
            <h3>Your Verification Code</h3>
            <div class="otp-code">${otp}</div>
            <p>This code is valid for 10 minutes only.</p>
          </div>
          
          <p>If you did not request this code, please ignore this email. Someone might have entered your email address by mistake.</p>
          
          <p>Best regards,<br>Fashion Show Event Team</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Fashion Show Event. All rights reserved.</p>
          <p>For any queries, contact us at: support@fashionshow.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Verify OTP - Placeholder function to maintain API compatibility
 * Actual verification is handled in the API route
 */
export async function verifyOTP(email, otp) {
  // This is a placeholder function as the actual verification happens in the API
  return true;
}
