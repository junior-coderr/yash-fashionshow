import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateAdminToken } from "@/lib/auth";

export async function POST(request) {
  try {
    const { password } = await request.json();

    // Check if password matches the admin password in environment variables
    if (password === process.env.ADMIN_PASSWORD) {
      // Generate JWT token for admin
      const token = generateAdminToken();

      // Create response to set cookie properly - this is the recommended way
      // to handle cookies in Next.js route handlers
      const response = NextResponse.json({
        success: true,
        message: "Login successful",
        token, // Include token in response body for client-side storage
      });

      // Set cookie on response object instead of using cookies() API directly
      response.cookies.set({
        name: "adminToken",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 1 day in seconds
        path: "/",
      });

      return response;
    } else {
      // Return error for incorrect password
      return NextResponse.json(
        {
          success: false,
          message: "Incorrect password",
        },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Login failed",
      },
      { status: 500 }
    );
  }
}
