import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";

export async function GET() {
  try {
    await dbConnect();
    const registrations = await Registration.find().sort({
      registrationDate: -1,
    });
    return NextResponse.json({ registrations });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch registrations" },
      { status: 500 }
    );
  }
}
