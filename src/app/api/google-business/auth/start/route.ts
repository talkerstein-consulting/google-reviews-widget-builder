import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_BUSINESS_SCOPE, GOOGLE_BUSINESS_STATE_COOKIE, getGoogleRedirectUri } from "@/lib/google-business";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID is not configured." }, { status: 503 });
  }

  const state = randomUUID();
  const origin = request.nextUrl.origin;
  const redirectUri = getGoogleRedirectUri(origin);
  const cookieStore = await cookies();

  cookieStore.set(GOOGLE_BUSINESS_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_BUSINESS_SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl);
}
