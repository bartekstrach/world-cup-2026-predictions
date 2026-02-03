import { NextResponse } from "next/server";
import { testConnection } from "@/lib/db";

export async function GET() {
  const dbOk = await testConnection();

  return NextResponse.json({
    status: dbOk ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
  });
}
