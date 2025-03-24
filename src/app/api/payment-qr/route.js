import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import PaymentQR from "@/models/PaymentQR";

// GET a payment QR code based on category selection
export async function GET(request) {
  try {
    await dbConnect();
    
    // Parse query parameters for category selection
    const url = new URL(request.url);
    const modelWalk = url.searchParams.get("modelWalk") === "true";
    const dance = url.searchParams.get("dance") === "true";
    const movieSelection = url.searchParams.get("movieSelection") === "true";
    
    // Find a QR code that matches the exact category combination
    let qrCode = await PaymentQR.findOne({
      modelWalk,
      dance,
      movieSelection,
      isActive: true,
    });
    
    // If no exact match is found, find a fallback QR code
    // Logic: Try to find a QR with at least one matching category
    if (!qrCode) {
      // Get all active QR codes
      const allQRCodes = await PaymentQR.find({ isActive: true });
      
      // Look for a QR code with similar categories
      // This will prioritize QR codes with more matching categories
      qrCode = allQRCodes.reduce((best, current) => {
        const currentMatches = [
          current.modelWalk === modelWalk,
          current.dance === dance,
          current.movieSelection === movieSelection,
        ].filter(Boolean).length;
        
        const bestMatches = best ? [
          best.modelWalk === modelWalk,
          best.dance === dance,
          best.movieSelection === movieSelection,
        ].filter(Boolean).length : -1;
        
        return currentMatches > bestMatches ? current : best;
      }, null);
    }
    
    if (!qrCode) {
      return NextResponse.json(
        { success: false, error: "No payment QR code found for these categories" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, qrCode });
  } catch (error) {
    console.error("Error fetching payment QR code:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payment QR code" },
      { status: 500 }
    );
  }
}