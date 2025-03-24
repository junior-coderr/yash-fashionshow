import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";

export async function POST(request) {
  try {
    await dbConnect();
    const { registrationId } = await request.json();

    const registration = await Registration.findOne({
      registrationId,
      paymentStatus: "verified",
    });

    if (!registration) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or unverified registration",
        },
        { status: 400 }
      );
    }

    // Check if ticket has already been used
    if (registration.entryVerified) {
      return NextResponse.json(
        {
          success: false,
          message: "Ticket has already been used",
        },
        { status: 400 }
      );
    }

    // Mark ticket as used
    registration.entryVerified = true;
    registration.entryTimestamp = new Date();
    await registration.save();

    return NextResponse.json({
      success: true,
      message: "Entry verified successfully",
      registration: {
        name: registration.name,
        registrationId: registration.registrationId,
        categories: registration.participationCategories,
        entryTimestamp: registration.entryTimestamp,
      },
    });
  } catch (error) {
    console.error("Ticket verification error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Verification failed",
      },
      { status: 500 }
    );
  }
}
