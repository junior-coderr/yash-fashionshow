import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import PaymentQR from "@/models/PaymentQR";
import { checkAdminSession } from "@/lib/auth";

// GET all payment QR codes
export async function GET(request) {
  try {
    await dbConnect();
    
    const qrCodes = await PaymentQR.find().sort({ updatedAt: -1 });
    
    return NextResponse.json({ success: true, qrCodes });
  } catch (error) {
    console.error("Error fetching payment QR codes:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payment QR codes" },
      { status: 500 }
    );
  }
}

// POST a new payment QR code
export async function POST(request) {
  try {
    // Verify admin session
    const isAdmin = await checkAdminSession(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const data = await request.json();
    const { modelWalk, dance, movieSelection, qrImageUrl, name } = data;
    
    // Check if this combination already exists
    const existingQR = await PaymentQR.findOne({
      modelWalk,
      dance,
      movieSelection
    });
    
    if (existingQR) {
      // Update the existing QR code
      existingQR.qrImageUrl = qrImageUrl;
      existingQR.name = name || "";
      existingQR.updatedAt = new Date();
      existingQR.isActive = true;
      
      await existingQR.save();
      
      return NextResponse.json({ 
        success: true, 
        message: "Payment QR updated successfully", 
        qrCode: existingQR 
      });
    }
    
    // Create new QR code
    const newQR = new PaymentQR({
      modelWalk,
      dance,
      movieSelection,
      qrImageUrl,
      name: name || "",
    });
    
    await newQR.save();
    
    return NextResponse.json(
      { 
        success: true, 
        message: "Payment QR created successfully", 
        qrCode: newQR 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating payment QR code:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create payment QR code" },
      { status: 500 }
    );
  }
}

// DELETE a payment QR code
export async function DELETE(request) {
  try {
    // Verify admin session
    const isAdmin = await checkAdminSession(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "QR code ID is required" },
        { status: 400 }
      );
    }
    
    const result = await PaymentQR.findByIdAndDelete(id);
    
    if (!result) {
      return NextResponse.json(
        { success: false, error: "QR code not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Payment QR deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting payment QR code:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete payment QR code" },
      { status: 500 }
    );
  }
}