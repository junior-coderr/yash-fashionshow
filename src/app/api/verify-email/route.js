import { NextResponse } from "next/server";
import { sendEmailVerificationOTP, verifyOTP } from "@/lib/email";
import { cookies } from "next/headers";
import crypto from "crypto";

// Encryption helper functions
function encryptData(data, secret = process.env.OTP_ENCRYPTION_SECRET || 'default-secret-key-change-in-prod') {
  const cipher = crypto.createCipher('aes-256-cbc', secret);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptData(encrypted, secret = process.env.OTP_ENCRYPTION_SECRET || 'default-secret-key-change-in-prod') {
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', secret);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Failed to decrypt data:', error);
    return null;
  }
}

// Send OTP for email verification
export async function POST(request) {
  try {
    const { email, name } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }
    
    // Generate OTP
    const otp = Math.random().toString().substring(2, 8);
    
    // Send OTP to user's email
    const emailSent = await sendEmailVerificationOTP(
      email,
      name || "Participant",
      otp
    );
    
    if (!emailSent) {
      return NextResponse.json(
        { success: false, message: "Failed to send verification email" },
        { status: 500 }
      );
    }
    
    // Store OTP data in an encrypted cookie
    const otpData = {
      email,
      otp,
      createdAt: new Date().toISOString(),
    };
    
    const encryptedData = encryptData(otpData);
    
    // Await cookies() before setting the cookie
    const cookieStore = await cookies();
    cookieStore.set("emailVerification", encryptedData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60, // 10 minutes expiry
      path: "/",
      sameSite: "strict",
    });
    
    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process verification" },
      { status: 500 }
    );
  }
}

// Verify OTP
export async function PUT(request) {
  try {
    const { otp } = await request.json();
    
    if (!otp) {
      return NextResponse.json(
        { success: false, message: "Verification code is required" },
        { status: 400 }
      );
    }

    // Await cookies() before getting the cookie value
    const cookieStore = await cookies();
    const encryptedData = cookieStore.get("emailVerification")?.value;
    
    if (!encryptedData) {
      return NextResponse.json(
        { success: false, message: "Verification session expired or not found" },
        { status: 400 }
      );
    }

    // Decrypt OTP data
    const otpData = decryptData(encryptedData);
    
    if (!otpData) {
      return NextResponse.json(
        { success: false, message: "Invalid verification session" },
        { status: 400 }
      );
    }

    const { email, otp: storedOTP, createdAt } = otpData;

    // Verify OTP
    if (otp !== storedOTP) {
      return NextResponse.json(
        { success: false, message: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Check if OTP is expired (10 minutes validity)
    const otpCreationTime = new Date(createdAt);
    const expiryTime = new Date(otpCreationTime.getTime() + 10 * 60000);
    
    if (new Date() > expiryTime) {
      return NextResponse.json(
        { success: false, message: "Verification code expired" },
        { status: 400 }
      );
    }

    // Set cookie to indicate email verification is successful
    cookieStore.set('emailVerified', email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60, // 24 hours validity
      path: '/',
      sameSite: 'strict'
    });

    // Clear the verification OTP cookie
    cookieStore.delete('emailVerification');

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
      email
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to verify email" },
      { status: 500 }
    );
  }
}

// Resend OTP (uses same logic as POST but with rate limiting)
export async function PATCH(request) {
  try {
    // Get existing OTP data from cookie
    const encryptedData = await cookies().get('emailVerification')?.value;
    
    if (!encryptedData) {
      return NextResponse.json(
        { success: false, message: "No verification in progress" },
        { status: 400 }
      );
    }

    // Decrypt OTP data
    const otpData = decryptData(encryptedData);
    
    if (!otpData) {
      return NextResponse.json(
        { success: false, message: "Invalid verification session" },
        { status: 400 }
      );
    }

    const { email } = otpData;
    const { name } = await request.json();

    // Generate new OTP
    const otp = Math.random().toString().substring(2, 8);

    // Send new OTP to user's email
    const emailSent = await sendEmailVerificationOTP(email, name, otp);
    
    if (!emailSent) {
      return NextResponse.json(
        { success: false, message: "Failed to resend verification email" },
        { status: 500 }
      );
    }

    // Store new OTP data in an encrypted cookie
    const newOTPData = {
      email,
      otp,
      createdAt: new Date().toISOString(),
    };
    
    const newEncryptedData = encryptData(newOTPData);
    
    // Set cookie with new encrypted data
    cookies().set('emailVerification', newEncryptedData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60, // 10 minutes expiry
      path: '/',
      sameSite: 'strict'
    });

    return NextResponse.json({
      success: true,
      message: "New verification code sent successfully"
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to resend verification code" },
      { status: 500 }
    );
  }
}
