import { cookies } from "next/headers";
import type { GoogleReview, PlaceReviewsPayload, PlaceSummary } from "@/lib/place-types";

export const GOOGLE_BUSINESS_SCOPE = "https://www.googleapis.com/auth/business.manage";
export const GOOGLE_BUSINESS_TOKEN_COOKIE = "gbp_tokens";
export const GOOGLE_BUSINESS_STATE_COOKIE = "gbp_oauth_state";

export type GoogleBusinessTokens = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  scope?: string;
  token_type?: string;
};

export type GoogleBusinessAccount = {
  name: string;
  accountName?: string;
  type?: string;
  role?: string;
};

export type GoogleBusinessLocation = {
  name: string;
  title?: string;
  locationName?: string;
  storefrontAddress?: string;
  address?: string;
  metadata?: {
    mapsUri?: string;
    newReviewUri?: string;
    mapsUrl?: string;
  };
};

type GoogleBusinessReview = {
  reviewId?: string;
  name?: string;
  reviewer?: {
    profilePhotoUrl?: string;
    displayName?: string;
    isAnonymous?: boolean;
  };
  starRating?: number | string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
};

type GoogleBusinessReviewResponse = {
  reviews?: GoogleBusinessReview[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
};

const oneHourMs = 60 * 60 * 1000;
const tokenMaxAgeSeconds = 60 * 60 * 24 * 30;

function encodeCookie(value: GoogleBusinessTokens) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeCookie(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as GoogleBusinessTokens;
  } catch {
    return null;
  }
}

function tokenCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: tokenMaxAgeSeconds,
  };
}

export function getGoogleRedirectUri(origin: string) {
  return process.env.GOOGLE_REDIRECT_URI || `${origin.replace(/\/+$/g, "")}/api/google-business/auth/callback`;
}

export async function getStoredGoogleBusinessTokens() {
  const cookieStore = await cookies();
  return decodeCookie(cookieStore.get(GOOGLE_BUSINESS_TOKEN_COOKIE)?.value);
}

export async function storeGoogleBusinessTokens(tokens: GoogleBusinessTokens) {
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_BUSINESS_TOKEN_COOKIE, encodeCookie(tokens), tokenCookieOptions());
}

export async function clearGoogleBusinessTokens() {
  const cookieStore = await cookies();
  cookieStore.delete(GOOGLE_BUSINESS_TOKEN_COOKIE);
}

async function refreshGoogleBusinessTokens(tokens: GoogleBusinessTokens) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret || !tokens.refresh_token) {
    return tokens;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    return tokens;
  }

  const refreshed = (await response.json()) as {
    access_token: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };

  const nextTokens: GoogleBusinessTokens = {
    ...tokens,
    access_token: refreshed.access_token,
    expires_at: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
    scope: refreshed.scope ?? tokens.scope,
    token_type: refreshed.token_type ?? tokens.token_type,
  };

  await storeGoogleBusinessTokens(nextTokens);
  return nextTokens;
}

export async function getValidGoogleBusinessTokens() {
  const tokens = await getStoredGoogleBusinessTokens();

  if (!tokens?.access_token) {
    throw new Error("Google Business Profile is not connected.");
  }

  if (tokens.expires_at - Date.now() < oneHourMs / 12) {
    return refreshGoogleBusinessTokens(tokens);
  }

  return tokens;
}

export async function googleBusinessFetch<T>(url: string) {
  const tokens = await getValidGoogleBusinessTokens();
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      authorization: `Bearer ${tokens.access_token}`,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || `Google Business Profile request failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

export function buildAddress(location: GoogleBusinessLocation) {
  const address = (location.storefrontAddress || location.address) as unknown as
    | string
    | {
        addressLines?: string[];
        locality?: string;
        administrativeArea?: string;
        postalCode?: string;
      };

  if (typeof address === "string") {
    return address;
  }

  if (!address) {
    return "";
  }

  return [
    ...(address.addressLines || []),
    [address.locality, address.administrativeArea, address.postalCode].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(", ");
}

function ratingValue(value: GoogleBusinessReview["starRating"]) {
  if (typeof value === "number") {
    return value;
  }

  const ratings: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
    STAR_RATING_UNSPECIFIED: 0,
  };

  return value ? (ratings[value] ?? Number(value)) || 0 : 0;
}

export function mapGoogleBusinessReview(review: GoogleBusinessReview): GoogleReview {
  return {
    reviewId: review.reviewId || review.name || null,
    reviewer: {
      isAnonymous: Boolean(review.reviewer?.isAnonymous),
      displayName: review.reviewer?.displayName || "Anonymous",
      profilePhotoUrl: review.reviewer?.profilePhotoUrl || "",
    },
    starRating: ratingValue(review.starRating),
    comment: review.comment || "",
    createTime: review.createTime || null,
    updateTime: review.updateTime || review.createTime || null,
  };
}

export async function listGoogleBusinessAccounts() {
  const accounts: GoogleBusinessAccount[] = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({ pageSize: "20" });
    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const payload = await googleBusinessFetch<{ accounts?: GoogleBusinessAccount[]; nextPageToken?: string }>(
      `https://mybusinessaccountmanagement.googleapis.com/v1/accounts?${params}`,
    );
    accounts.push(...(payload.accounts || []));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);

  return accounts;
}

export async function listGoogleBusinessLocations(accountName: string) {
  const locations: GoogleBusinessLocation[] = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const payload = await googleBusinessFetch<{ locations?: GoogleBusinessLocation[]; nextPageToken?: string }>(
      `https://mybusiness.googleapis.com/v4/${accountName}/locations?${params}`,
    );
    locations.push(...(payload.locations || []));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);

  return locations;
}

export async function getGoogleBusinessReviews({
  locationName,
  placeName,
  formattedAddress,
  profileUrl,
}: {
  locationName: string;
  placeName?: string;
  formattedAddress?: string;
  profileUrl?: string;
}) {
  const reviews: GoogleReview[] = [];
  let pageToken = "";
  let averageRating: number | null = null;
  let totalReviewCount: number | null = null;

  do {
    const params = new URLSearchParams({
      pageSize: "50",
      orderBy: "updateTime desc",
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const payload = await googleBusinessFetch<GoogleBusinessReviewResponse>(
      `https://mybusiness.googleapis.com/v4/${locationName}/reviews?${params}`,
    );

    averageRating = typeof payload.averageRating === "number" ? payload.averageRating : averageRating;
    totalReviewCount = typeof payload.totalReviewCount === "number" ? payload.totalReviewCount : totalReviewCount;
    reviews.push(...(payload.reviews || []).map(mapGoogleBusinessReview));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);

  const place: PlaceSummary = {
    id: locationName,
    name: placeName || "Selected business location",
    formattedAddress: formattedAddress || "",
    averageRating,
    totalReviewCount,
    profileUrl: profileUrl || null,
  };

  const payload: PlaceReviewsPayload = { place, reviews };
  return payload;
}
