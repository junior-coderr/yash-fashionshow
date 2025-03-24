import { NextResponse } from "next/server";
import { checkAdminSession } from "@/lib/auth";

export async function GET(request) {
  const isAdmin = await checkAdminSession(request);

  return NextResponse.json({
    isAdmin,
  });
}
