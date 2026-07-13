import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_BUSINESS_STATE_COOKIE,
  getGoogleRedirectUri,
  storeGoogleBusinessTokens,
  type GoogleBusinessTokens,
} from "@/lib/google-business";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_BUSINESS_STATE_COOKIE)?.value;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Google OAuth credentials are not configured." }, { status: 503 });
  }

  if (!code || !state || state !== expectedState) {
    return NextResponse.json({ error: "Google OAuth state could not be verified." }, { status: 400 });
  }

  const redirectUri = getGoogleRedirectUri(request.nextUrl.origin);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Google OAuth token exchange failed." }, { status: 502 });
  }

  const body = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };

  const tokens: GoogleBusinessTokens = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: Date.now() + (body.expires_in ?? 3600) * 1000,
    scope: body.scope,
    token_type: body.token_type,
  };

  await storeGoogleBusinessTokens(tokens);
  cookieStore.delete(GOOGLE_BUSINESS_STATE_COOKIE);

  return NextResponse.redirect(new URL("/?connected=google-business", request.nextUrl.origin));
}
