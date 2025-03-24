import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import { generateQRCode } from "@/lib/email";

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = params;

    const registration = await Registration.findOne({
      registrationId: id,
      paymentStatus: "verified",
    });

    if (!registration) {
      return NextResponse.json(
        {
          success: false,
          message: "Registration not found or not verified",
        },
        { status: 404 }
      );
    }

    // Generate QR code
    const qrCodeImage = await generateQRCode({
      registrationId: registration.registrationId,
      name: registration.name,
    });

    // Store the QR code in the registration document
    if (qrCodeImage) {
      registration.qrCodeImage = qrCodeImage;
      await registration.save();
    }

    return NextResponse.json({
      success: true,
      qrCodeImage: qrCodeImage,
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error generating QR code",
      },
      { status: 500 }
    );
  }
}
