import { NextResponse } from "next/server";
import { recalculateAllPoints } from "@/lib/scoring";

export async function POST() {
  try {
    const result = await recalculateAllPoints();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
