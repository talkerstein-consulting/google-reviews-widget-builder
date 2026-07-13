import { NextResponse } from "next/server";
import { getStoredGoogleBusinessTokens } from "@/lib/google-business";

export const dynamic = "force-dynamic";

export async function GET() {
  const tokens = await getStoredGoogleBusinessTokens();
  return NextResponse.json({
    connected: Boolean(tokens?.access_token),
    expiresAt: tokens?.expires_at ?? null,
    hasRefreshToken: Boolean(tokens?.refresh_token),
  });
}
