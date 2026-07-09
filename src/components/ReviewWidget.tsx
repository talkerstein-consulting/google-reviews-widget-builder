"use client";

import { ExternalLink, Star } from "lucide-react";
import type { ComponentType, CSSProperties } from "react";
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

function tokenList(value: string) {
  return value
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

function prepareReviews(reviews: GoogleReview[], config: WidgetConfig) {
  const excludedKeywords = tokenList(config.excludeKeywords);
  const excludedReviewers = tokenList(config.excludeReviewers);

  return reviews
    .filter((review) => (config.hideEmptyReviews ? review.comment.trim().length > 0 : true))
    .filter((review) => review.starRating >= config.minRating)
    .filter((review) => {
      const comment = review.comment.toLowerCase();
      return !excludedKeywords.some((keyword) => comment.includes(keyword));
    })
    .filter((review) => {
      const reviewer = review.reviewer.displayName.toLowerCase();
      return !excludedReviewers.some((name) => reviewer.includes(name));
    })
    .sort((a, b) => {
      if (config.reviewSort === "highest") {
        return b.starRating - a.starRating;
      }
      if (config.reviewSort === "lowest") {
        return a.starRating - b.starRating;
      }
      return new Date(b.createTime || 0).getTime() - new Date(a.createTime || 0).getTime();
    });
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

function ReviewCard({
  config,
  review,
}: {
  config: WidgetConfig;
  review: GoogleReview;
}) {
  const reviewerName = displayName(review, config.nameDisplay);
  const timestamp = dateLabel(review, config.dateDisplay);
  const centered = config.template === "spotlight";
  const equalCardMinHeight = config.equalHeightCards ? config.cardMinHeight : undefined;
  const authorBlock = (
    <div className={`flex min-w-0 items-center gap-3 ${centered ? "justify-center" : ""}`}>
      {config.showReviewerPhoto ? (
        review.reviewer.profilePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={review.reviewer.profilePhotoUrl}
            alt=""
            className="h-9 w-9 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: config.accentColor }}
          >
            {reviewerName.charAt(0)}
          </div>
        )
      ) : null}
      <div className="min-w-0">
        <div className="truncate font-medium">{reviewerName}</div>
        <div className={`flex flex-wrap items-center gap-2 text-xs opacity-70 ${centered ? "justify-center" : ""}`}>
          <StarRow rating={review.starRating} color={config.starColor} />
          {timestamp ? <span>{timestamp}</span> : null}
        </div>
      </div>
    </div>
  );

  return (
    <article
      className={`break-inside-avoid border p-4 shadow-sm ${centered ? "text-center" : ""} ${
        config.equalHeightCards ? "flex flex-col" : ""
      }`}
      style={{
        backgroundColor: config.cardColor,
        borderColor: `${config.accentColor}33`,
        borderRadius: config.cardRadius,
        height: config.equalHeightCards && config.layout !== "masonry" ? "100%" : undefined,
        minHeight: equalCardMinHeight,
        marginBottom: config.layout === "masonry" ? config.cardGap : undefined,
      }}
    >
      {config.template === "bubble" ? null : <div className="mb-3">{authorBlock}</div>}
      <p
        className={`leading-6 opacity-90 ${config.equalHeightCards ? "flex-1" : ""}`}
        style={{
          fontSize: config.reviewFontSize,
        }}
      >
        {review.comment.length > config.maxCharacters
          ? `${review.comment.slice(0, config.maxCharacters).trim()}...`
          : review.comment}
      </p>
      {config.template === "bubble" ? <div className="mt-4 border-t pt-3">{authorBlock}</div> : null}
    </article>
  );
}

function Header({
  config,
  place,
}: {
  config: WidgetConfig;
  place: PlaceSummary;
}) {
  if (!config.showHeader) {
    return null;
  }

  const title = config.customTitle.trim() || place.name;

  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="text-sm font-medium opacity-70">Google reviews</div>
        <h2 className="font-semibold" style={{ fontSize: config.titleFontSize }}>
          {title}
        </h2>
        {config.showAddress && place.formattedAddress ? (
          <div className="mt-1 max-w-xl text-sm opacity-70">{place.formattedAddress}</div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {config.showRatingSummary && place.averageRating ? (
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{place.averageRating.toFixed(1)}</span>
            <StarRow rating={place.averageRating} color={config.starColor} />
            {place.totalReviewCount ? <span className="text-sm opacity-70">({place.totalReviewCount})</span> : null}
          </div>
        ) : null}
        {config.showReviewButton && place.profileUrl ? (
          <a
            href={place.profileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: config.buttonColor }}
          >
            {config.reviewButtonLabel} <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function ReviewsLayout({
  config,
  place,
  reviews,
}: {
  config: WidgetConfig;
  place: PlaceSummary;
  reviews: GoogleReview[];
}) {
  const visibleCount =
    config.layout === "list" ? Math.max(1, config.maxItems) : Math.max(1, config.columns * config.rows);
  const visibleReviews = prepareReviews(reviews, config).slice(0, visibleCount);

  return (
    <section className="rgwb-reviews-widget" style={{ color: config.textColor }}>
      <Header config={config} place={place} />

      {visibleReviews.length === 0 ? (
        <div
          className="rounded-lg border border-dashed p-6 text-center text-sm opacity-80"
          style={{ borderColor: `${config.accentColor}55` }}
        >
          No reviews match the current filters.
        </div>
      ) : config.layout === "masonry" ? (
        <div>
          <div
            style={{
              columnCount: config.columns,
              columnGap: config.cardGap,
            }}
          >
            {visibleReviews.map((review) => (
              <ReviewCard key={`${review.reviewId}-${review.reviewer.displayName}`} config={config} review={review} />
            ))}
          </div>
        </div>
      ) : (
        <div
          className="grid"
          style={{
            gap: config.cardGap,
            gridTemplateColumns:
              config.layout === "list" ? "1fr" : `repeat(${config.columns}, minmax(0, 1fr))`,
            gridAutoRows: config.equalHeightCards && config.layout !== "list" ? "1fr" : undefined,
            alignItems: config.equalHeightCards ? "stretch" : "start",
          }}
        >
          {visibleReviews.map((review) => (
            <ReviewCard key={`${review.reviewId}-${review.reviewer.displayName}`} config={config} review={review} />
          ))}
        </div>
      )}

      {place.profileUrl ? (
        <a
          href={place.profileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium"
          style={{ color: config.linkColor }}
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
  const filteredReviews = prepareReviews(reviews, config);
  const equalCardMinHeight = config.equalHeightCards ? config.cardMinHeight : undefined;
  const wrapperStyle: CSSProperties & { "--rgwb-card-min-height": string } = {
    backgroundColor: config.backgroundColor,
    color: config.textColor,
    "--rgwb-card-min-height": `${config.cardMinHeight}px`,
  };

  if (!place || (!loading && reviews.length === 0 && config.layout !== "badge")) {
    return <EmptyWidget config={config} loading={loading} />;
  }

  const commonProps = {
    reviews: filteredReviews,
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
      borderRadius: config.cardRadius,
      height: config.equalHeightCards ? "100%" : undefined,
      minHeight: equalCardMinHeight,
      display: config.equalHeightCards ? "flex" : undefined,
      flexDirection: config.equalHeightCards ? "column" : undefined,
    },
    reviewTextStyle: {
      color: config.textColor,
      fontSize: config.reviewFontSize,
    },
    reviewerNameStyle: { color: config.textColor },
    reviewerDateStyle: { color: config.textColor, opacity: 0.7 },
    badgeContainerStyle: {
      backgroundColor: config.cardColor,
      color: config.textColor,
      borderColor: `${config.accentColor}33`,
      borderRadius: config.cardRadius,
    },
    badgeRatingStyle: { color: config.textColor },
    badgeLabelStyle: { color: config.textColor },
    badgeLinkStyle: { color: config.linkColor },
    carouselCardClassName: config.equalHeightCards ? "rgwb-carousel-frame" : undefined,
    carouselCardStyle: config.equalHeightCards ? { height: "100%" } : undefined,
    reviewCardClassName: config.equalHeightCards ? "rgwb-library-card" : undefined,
    reviewTextClassName: config.equalHeightCards ? "rgwb-review-text" : undefined,
  };

  return (
    <div
      className={`${embedded ? "h-full w-full overflow-hidden p-3" : "w-full"} ${
        config.equalHeightCards ? "rgwb-equal-height" : ""
      }`}
      style={wrapperStyle}
    >
      {["grid", "list", "masonry"].includes(config.layout) && place ? (
        <ReviewsLayout config={config} place={place} reviews={reviews} />
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
