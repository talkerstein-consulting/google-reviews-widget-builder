import { NextRequest, NextResponse } from "next/server";
import { getGoogleBusinessReviews } from "@/lib/google-business";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const locationName = request.nextUrl.searchParams.get("locationName")?.trim();
  const placeName = request.nextUrl.searchParams.get("placeName")?.trim();
  const formattedAddress = request.nextUrl.searchParams.get("formattedAddress")?.trim();
  const profileUrl = request.nextUrl.searchParams.get("profileUrl")?.trim();

  if (!locationName?.startsWith("accounts/") || !locationName.includes("/locations/")) {
    return NextResponse.json({ error: "Missing Google Business Profile location." }, { status: 400 });
  }

  try {
    const payload = await getGoogleBusinessReviews({
      locationName,
      placeName,
      formattedAddress,
      profileUrl,
    });

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load Google Business Profile reviews.";
    console.error("Google Business Profile reviews error:", message);
    return NextResponse.json(
      { error: message },
      { status: message.includes("not connected") ? 401 : 502 },
    );
  }
}
