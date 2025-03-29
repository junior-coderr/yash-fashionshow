import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import CategoryCosts from "@/models/CategoryCosts";
import { checkAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    await dbConnect();

    // Get category costs
    let costs = await CategoryCosts.findOne();
    if (!costs) {
      // Create default costs if none exist
      costs = await CategoryCosts.create({
        modelWalk: 5000,
        dance: 5000,
        movieSelection: 5000,
      });
    }

    return NextResponse.json({ costs });
  } catch (error) {
    console.error("Error fetching category costs:", error);
    return NextResponse.json(
      { error: "Failed to fetch category costs" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Check admin authentication
    const isAdmin = await checkAdminSession(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 401 }
      );
    }

    await dbConnect();
    const data = await request.json();

    // Validate costs
    const { modelWalk, dance, movieSelection } = data;
    if (
      typeof modelWalk !== "number" ||
      typeof dance !== "number" ||
      typeof movieSelection !== "number" ||
      modelWalk < 0 ||
      dance < 0 ||
      movieSelection < 0
    ) {
      return NextResponse.json(
        { error: "Invalid cost values. All costs must be non-negative numbers." },
        { status: 400 }
      );
    }

    // Update costs
    const updatedCosts = await CategoryCosts.updateCosts(data);

    return NextResponse.json({ costs: updatedCosts });
  } catch (error) {
    console.error("Error updating category costs:", error);
    return NextResponse.json(
      { error: "Failed to update category costs" },
      { status: 500 }
    );
  }
}