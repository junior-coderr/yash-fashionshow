import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import { checkAdminSession } from "@/lib/auth";

export async function POST(request, { params }) {
  try {
    // Strict admin authentication check
    const adminToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!adminToken) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Admin authentication required" },
        { status: 401 }
      );
    }

    // Check if user is an admin using JWT verification
    const isAdmin = await checkAdminSession(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    await dbConnect();
    const { id } = await params;
    
    // Find registration by ID
    const registration = await Registration.findOne({ registrationId: id });
    if (!registration) {
      return NextResponse.json(
        { success: false, message: "Registration not found" },
        { status: 404 }
      );
    }

    // Check if payment is verified (only allow entry for verified payments)
    if (registration.paymentStatus !== "verified") {
      return NextResponse.json(
        { success: false, message: "Payment not verified" },
        { status: 400 }
      );
    }

    // Check if entry already verified
    if (registration.entryVerified) {
      return NextResponse.json(
        {
          success: false,
          message: "Entry already verified",
          entryTimestamp: registration.entryTimestamp,
          alreadyVerified: true
        },
        { status: 400 }
      );
    }

    // Mark entry as verified
    registration.entryVerified = true;
    registration.entryTimestamp = new Date();
    await registration.save();

    return NextResponse.json({
      success: true,
      message: "Entry verified successfully",
      entryTimestamp: registration.entryTimestamp,
    });
  } catch (error) {
    console.error("Error verifying entry:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to verify entry" },
      { status: 500 }
    );
  }
}
