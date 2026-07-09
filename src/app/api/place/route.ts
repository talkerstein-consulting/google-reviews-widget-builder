import { NextRequest, NextResponse } from "next/server";
import type { GoogleReview, PlaceReviewsPayload } from "@/lib/place-types";

export const dynamic = "force-dynamic";

type GooglePlaceDetailsResponse = {
  status: string;
  error_message?: string;
  result?: {
    place_id?: string;
    name?: string;
    formatted_address?: string;
    rating?: number;
    user_ratings_total?: number;
    url?: string;
    reviews?: Array<{
      author_name?: string;
      profile_photo_url?: string;
      rating?: number;
      text?: string;
      time?: number;
    }>;
  };
};

type GoogleRawReview = NonNullable<NonNullable<GooglePlaceDetailsResponse["result"]>["reviews"]>[number];

function error(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

function mapReview(rawReview: GoogleRawReview): GoogleReview {
  const date = rawReview.time ? new Date(rawReview.time * 1000).toISOString() : null;

  return {
    reviewId: rawReview.time && rawReview.author_name ? `${rawReview.author_name}-${rawReview.time}` : null,
    reviewer: {
      isAnonymous: !rawReview.author_name,
      displayName: rawReview.author_name || "Anonymous",
      profilePhotoUrl: rawReview.profile_photo_url || "",
    },
    starRating: rawReview.rating || 0,
    comment: rawReview.text || "",
    createTime: date,
    updateTime: date,
  };
}

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId")?.trim();
  const disableTranslation = request.nextUrl.searchParams.get("disableTranslation") === "true";
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (!placeId) {
    return error("Missing placeId.", 400, "MISSING_PLACE_ID");
  }

  if (!apiKey) {
    return error("GOOGLE_PLACES_API_KEY is not configured.", 503, "MISSING_GOOGLE_PLACES_API_KEY");
  }

  const params = new URLSearchParams({
    place_id: placeId,
    fields: "place_id,name,formatted_address,rating,user_ratings_total,url,reviews",
    reviews_sort: "newest",
    key: apiKey,
  });

  if (disableTranslation) {
    params.set("reviews_no_translations", "true");
  }

  const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    return error("Google Places request failed.", response.status, "GOOGLE_HTTP_ERROR");
  }

  const data = (await response.json()) as GooglePlaceDetailsResponse;

  if (data.status !== "OK" || !data.result) {
    return error(data.error_message || "Google Places did not return this place.", 502, data.status);
  }

  const payload: PlaceReviewsPayload = {
    place: {
      id: data.result.place_id || placeId,
      name: data.result.name || "Selected place",
      formattedAddress: data.result.formatted_address || "",
      averageRating: typeof data.result.rating === "number" ? data.result.rating : null,
      totalReviewCount: typeof data.result.user_ratings_total === "number" ? data.result.user_ratings_total : null,
      profileUrl: data.result.url || null,
    },
    reviews: (data.result.reviews || []).map(mapReview),
  };

  return NextResponse.json(payload);
}
