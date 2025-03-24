import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import { generateQRCode } from "@/lib/email";

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const registration = await Registration.findOne({
      registrationId: id,
    });

    if (!registration) {
      return NextResponse.json(
        {
          success: false,
          message: "Registration not found",
        },
        { status: 404 }
      );
    }

    // Generate QR code if payment is verified but QR code is missing
    let qrCodeImage = registration.qrCodeImage;
    if (registration.paymentStatus === "verified" && !qrCodeImage) {
      qrCodeImage = await generateQRCode({
        registrationId: registration.registrationId,
        name: registration.name,
      });

      if (qrCodeImage) {
        registration.qrCodeImage = qrCodeImage;
        await registration.save();
      }
    }

    return NextResponse.json({
      success: true,
      registration: {
        ...registration.toObject(),
        qrCodeImage,
      },
    });
  } catch (error) {
    console.error("Error fetching registration:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error fetching registration",
      },
      { status: 500 }
    );
  }
}
