import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import { sendPaymentStatusEmail, generateQRCode } from "@/lib/email";

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const { status } = await request.json();

    let registration = await Registration.findOne({ registrationId: id });

    if (!registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    // Generate QR code if status is being set to verified
    let qrCodeImage = null;
    if (status === "verified") {
      qrCodeImage = await generateQRCode({
        registrationId: registration.registrationId,
        name: registration.name,
      });

      if (qrCodeImage) {
        registration.qrCodeImage = qrCodeImage;
      }
    }

    registration.paymentStatus = status;
    await registration.save();

    // Send email notification about status change
    await sendPaymentStatusEmail({
      ...registration.toObject(),
      qrCodeImage, // Make sure to pass the new QR code to the email function
    });

    return NextResponse.json({
      success: true,
      registration: {
        ...registration.toObject(),
        qrCodeImage,
      },
    });
  } catch (error) {
    console.error("Error updating status:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
