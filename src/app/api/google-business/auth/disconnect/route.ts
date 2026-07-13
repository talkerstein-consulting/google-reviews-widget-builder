import { NextResponse } from "next/server";
import { clearGoogleBusinessTokens } from "@/lib/google-business";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearGoogleBusinessTokens();
  return NextResponse.json({ connected: false });
}
