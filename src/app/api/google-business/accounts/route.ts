import { NextResponse } from "next/server";
import { listGoogleBusinessAccounts } from "@/lib/google-business";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const accounts = await listGoogleBusinessAccounts();
    return NextResponse.json({ accounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load Google Business Profile accounts.";
    return NextResponse.json(
      { error: message },
      { status: message.includes("not connected") ? 401 : 502 },
    );
  }
}
