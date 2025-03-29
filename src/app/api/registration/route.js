import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import CategoryCosts from "@/models/CategoryCosts";
import {
  sendRegistrationConfirmationEmail,
  sendAdminNotificationEmail,
  generateQRCode,
} from "@/lib/email";

export async function POST(request) {
  try {
    await dbConnect();

    const data = await request.json();

    // Get category costs
    let costs = await CategoryCosts.findOne();
    if (!costs) {
      // Use default costs if none set
      costs = {
        modelWalk: 5000,
        dance: 5000,
        movieSelection: 5000,
      };
    }

    // Calculate total amount based on selected categories and their costs
    const totalAmount = Object.entries(data.participationCategories)
      .filter(([_, selected]) => selected)
      .reduce((total, [category]) => total + costs[category], 0);

    // Create a new registration with calculated amount
    const registration = new Registration({
      ...data,
      totalAmount,
    });

    await registration.save();

    // Generate QR code
    const qrCodeImage = await generateQRCode({
      registrationId: registration.registrationId,
      name: registration.name,
    });

    // Store the QR code in the database if generated
    if (qrCodeImage) {
      registration.qrCodeImage = qrCodeImage;
      await registration.save();
      console.log("QR code saved to registration");
    }

    // Send confirmation email to the registrant
    try {
      await sendRegistrationConfirmationEmail({
        ...registration.toObject(),
        qrCodeImage,
      });
      console.log(
        "Registration confirmation email sent successfully with QR code:",
        !!qrCodeImage
      );
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError);
      // Don't fail the registration if email sending fails
    }

    // Send notification email to admin
    try {
      await sendAdminNotificationEmail(registration);
    } catch (emailError) {
      console.error("Error sending admin notification email:", emailError);
      // Don't fail the registration if email sending fails
    }

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        registrationId: registration.registrationId,
        qrCodeImage, // Include QR code in the response
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Registration failed",
      },
      { status: 500 }
    );
  }
}
