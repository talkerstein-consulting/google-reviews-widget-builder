"use client";

import { ExternalLink, Star } from "lucide-react";
import type { ComponentType } from "react";
import { ReactGoogleReviews } from "react-google-reviews";
import "react-google-reviews/dist/index.css";
import type { GoogleReview, PlaceReviewsPayload, PlaceSummary } from "@/lib/place-types";
import type { WidgetConfig } from "@/lib/widget-config";

const GoogleReviews = ReactGoogleReviews as unknown as ComponentType<Record<string, unknown>>;

type ReviewWidgetProps = {
  config: WidgetConfig;
  data: PlaceReviewsPayload | null;
  loading?: boolean;
  embedded?: boolean;
};

function StarRow({ rating, color }: { rating: number; color: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} star rating`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className="h-4 w-4"
          fill={index < Math.round(rating) ? color : "transparent"}
          color={index < Math.round(rating) ? color : "#b7bfcc"}
          strokeWidth={2}
        />
      ))}
    </div>
  );
}

function displayName(review: GoogleReview, mode: WidgetConfig["nameDisplay"]) {
  const name = review.reviewer.displayName;
  if (mode === "fullNames") {
    return name;
  }

  const parts = name.split(/\s+/).filter(Boolean);
  if (mode === "firstNamesOnly" || parts.length < 2) {
    return parts[0] || name;
  }

  return `${parts[0]} ${parts[1].charAt(0)}.`;
}

function dateLabel(review: GoogleReview, mode: WidgetConfig["dateDisplay"]) {
  if (mode === "none" || !review.createTime) {
    return "";
  }

  const date = new Date(review.createTime);
  if (mode === "absolute") {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  const diff = Date.now() - date.getTime();
  const days = Math.max(1, Math.round(diff / 86_400_000));
  if (days < 31) {
    return `${days}d ago`;
  }
  const months = Math.max(1, Math.round(days / 30));
  if (months < 12) {
    return `${months}mo ago`;
  }
  return `${Math.max(1, Math.round(months / 12))}y ago`;
}

function GridWidget({
  config,
  place,
  reviews,
}: {
  config: WidgetConfig;
  place: PlaceSummary;
  reviews: GoogleReview[];
}) {
  const visibleReviews = reviews
    .filter((review) => (config.hideEmptyReviews ? review.comment.trim().length > 0 : true))
    .slice(0, Math.max(1, config.maxItems));

  return (
    <section className="rgwb-grid-widget" style={{ color: config.textColor }}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium opacity-70">Google reviews</div>
          <h2 className="text-xl font-semibold">{place.name}</h2>
        </div>
        {place.averageRating ? (
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{place.averageRating.toFixed(1)}</span>
            <StarRow rating={place.averageRating} color={config.accentColor} />
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {visibleReviews.map((review) => (
          <article
            key={`${review.reviewId}-${review.reviewer.displayName}`}
            className="min-h-44 rounded-lg border p-4 shadow-sm"
            style={{
              backgroundColor: config.cardColor,
              borderColor: `${config.accentColor}33`,
            }}
          >
            <div className="mb-3 flex items-start gap-3">
              {review.reviewer.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={review.reviewer.profilePhotoUrl}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: config.accentColor }}
                >
                  {displayName(review, "firstNamesOnly").charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{displayName(review, config.nameDisplay)}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs opacity-70">
                  <StarRow rating={review.starRating} color={config.accentColor} />
                  {dateLabel(review, config.dateDisplay) ? <span>{dateLabel(review, config.dateDisplay)}</span> : null}
                </div>
              </div>
            </div>
            <p className="text-sm leading-6 opacity-90">
              {review.comment.length > config.maxCharacters
                ? `${review.comment.slice(0, config.maxCharacters).trim()}...`
                : review.comment}
            </p>
          </article>
        ))}
      </div>

      {place.profileUrl ? (
        <a
          href={place.profileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium"
          style={{ color: config.accentColor }}
        >
          View on Google <ExternalLink className="h-4 w-4" />
        </a>
      ) : null}
    </section>
  );
}

function EmptyWidget({ config, loading }: { config: WidgetConfig; loading?: boolean }) {
  return (
    <div
      className="flex min-h-64 items-center justify-center rounded-lg border border-dashed p-8 text-center"
      style={{
        backgroundColor: config.cardColor,
        borderColor: `${config.accentColor}55`,
        color: config.textColor,
      }}
    >
      <div>
        <div className="text-sm font-medium opacity-70">{loading ? "Loading reviews" : "No place selected"}</div>
        <div className="mt-2 text-lg font-semibold">
          {loading ? "Fetching the latest Google review payload" : "Choose a place to preview the widget"}
        </div>
      </div>
    </div>
  );
}

export function ReviewWidget({ config, data, loading, embedded = false }: ReviewWidgetProps) {
  const reviews = data?.reviews ?? [];
  const place = data?.place;

  if (!place || (!loading && reviews.length === 0 && config.layout !== "badge")) {
    return <EmptyWidget config={config} loading={loading} />;
  }

  const commonProps = {
    reviews,
    isLoading: loading,
    theme: config.theme,
    nameDisplay: config.nameDisplay,
    dateDisplay: config.dateDisplay,
    logoVariant: config.logoVariant,
    maxCharacters: config.maxCharacters,
    hideEmptyReviews: config.hideEmptyReviews,
    disableTranslation: config.disableTranslation,
    averageRating: place?.averageRating ?? 5,
    totalReviewCount: place?.totalReviewCount ?? reviews.length,
    profileUrl: place?.profileUrl ?? undefined,
    accessibility: true,
    reviewVariant: config.reviewVariant,
    reviewCardStyle: {
      backgroundColor: config.cardColor,
      borderColor: `${config.accentColor}33`,
      color: config.textColor,
      borderRadius: 8,
    },
    reviewTextStyle: { color: config.textColor },
    reviewerNameStyle: { color: config.textColor },
    reviewerDateStyle: { color: config.textColor, opacity: 0.7 },
    badgeContainerStyle: {
      backgroundColor: config.cardColor,
      color: config.textColor,
      borderColor: `${config.accentColor}33`,
      borderRadius: 8,
    },
    badgeRatingStyle: { color: config.textColor },
    badgeLabelStyle: { color: config.textColor },
    badgeLinkStyle: { color: config.accentColor },
  };

  return (
    <div
      className={embedded ? "h-full w-full overflow-hidden p-3" : "w-full"}
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
      }}
    >
      {config.layout === "grid" && place ? (
        <GridWidget config={config} place={place} reviews={reviews} />
      ) : config.layout === "badge" ? (
        <GoogleReviews {...commonProps} layout="badge" badgeLabel="Google Rating" />
      ) : (
        <GoogleReviews
          {...commonProps}
          layout="carousel"
          carouselAutoplay={config.carouselAutoplay}
          carouselSpeed={config.carouselSpeed}
          maxItems={config.maxItems}
          showDots={config.showDots}
        />
      )}
    </div>
  );
}
