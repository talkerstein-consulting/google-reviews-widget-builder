import { NextRequest, NextResponse } from "next/server";
import { buildAddress, listGoogleBusinessLocations } from "@/lib/google-business";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const accountName = request.nextUrl.searchParams.get("accountName")?.trim();

  if (!accountName?.startsWith("accounts/")) {
    return NextResponse.json({ error: "Missing Google Business Profile account." }, { status: 400 });
  }

  try {
    const locations = await listGoogleBusinessLocations(accountName);
    return NextResponse.json({
      locations: locations.map((location) => ({
        ...location,
        formattedAddress: buildAddress(location),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load Google Business Profile locations.";
    return NextResponse.json(
      { error: message },
      { status: message.includes("not connected") ? 401 : 502 },
    );
  }
}
