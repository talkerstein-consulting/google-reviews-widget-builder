"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { GoogleReview, PlaceReviewsPayload, PlaceSummary } from "@/lib/place-types";
import type { FontFamily, LogoVariant, WidgetConfig } from "@/lib/widget-config";

type ReviewWidgetProps = {
  config: WidgetConfig;
  data: PlaceReviewsPayload | null;
  loading?: boolean;
  embedded?: boolean;
};

const FONT_STACKS: Record<FontFamily, string | undefined> = {
  inherit: undefined,
  serif: 'Georgia, "Times New Roman", serif',
  sans: '"Helvetica Neue", Arial, sans-serif',
  mono: '"SFMono-Regular", ui-monospace, monospace',
};

// Google's Places API terms require visible attribution back to Google — this mark
// is always rendered (icon or full) and is not a config option that can be disabled.
function GoogleMark({ variant, color }: { variant: LogoVariant; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium opacity-70" style={{ color }}>
      <svg viewBox="0 0 48 48" className="h-3.5 w-3.5" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
        />
        <path
          fill="#34A853"
          d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.32-9.08H4.34v5.7C7.96 41.07 15.4 46 24 46z"
        />
        <path fill="#FBBC05" d="M11.68 28.17A13.9 13.9 0 0 1 10.87 24c0-1.45.25-2.86.71-4.17v-5.7H4.34A21.93 21.93 0 0 0 2 24c0 3.55.85 6.91 2.34 9.87z" />
        <path
          fill="#EA4335"
          d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.13l7.34 5.7c1.74-5.21 6.59-9.08 12.32-9.08z"
        />
      </svg>
      {variant === "full" ? "Reviews from Google" : "Google"}
    </span>
  );
}

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
    // Header text/CTA can be hidden, but Google attribution cannot — show the bare minimum.
    return (
      <div className="mb-3">
        <GoogleMark variant={config.logoVariant} color={config.textColor} />
      </div>
    );
  }

  const title = config.customTitle.trim() || place.name;

  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <GoogleMark variant={config.logoVariant} color={config.textColor} />
        <h2 className="mt-1 font-semibold" style={{ fontSize: config.titleFontSize }}>
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

function CarouselLayout({
  config,
  place,
  reviews,
}: {
  config: WidgetConfig;
  place: PlaceSummary;
  reviews: GoogleReview[];
}) {
  const perView = Math.max(1, config.maxItems);
  const visibleReviews = prepareReviews(reviews, config);
  const pageCount = Math.max(1, Math.ceil(visibleReviews.length / perView));
  const [page, setPage] = useState(0);
  const activePage = Math.min(page, pageCount - 1);

  useEffect(() => {
    setPage(0);
  }, [visibleReviews.length, perView]);

  useEffect(() => {
    if (!config.carouselAutoplay || pageCount <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setPage((current) => (current + 1) % pageCount);
    }, config.carouselSpeed);
    return () => window.clearInterval(timer);
  }, [config.carouselAutoplay, config.carouselSpeed, pageCount]);

  const pageReviews = visibleReviews.slice(activePage * perView, activePage * perView + perView);

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
      ) : (
        <div className="relative">
          <div
            className="grid"
            style={{ gap: config.cardGap, gridTemplateColumns: `repeat(${pageReviews.length}, minmax(0, 1fr))` }}
          >
            {pageReviews.map((review) => (
              <ReviewCard key={`${review.reviewId}-${review.reviewer.displayName}`} config={config} review={review} />
            ))}
          </div>

          {pageCount > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous reviews"
                onClick={() => setPage((current) => (current - 1 + pageCount) % pageCount)}
                className="absolute -left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border bg-white/90 shadow-sm"
                style={{ borderColor: `${config.accentColor}55`, color: config.accentColor }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next reviews"
                onClick={() => setPage((current) => (current + 1) % pageCount)}
                className="absolute -right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border bg-white/90 shadow-sm"
                style={{ borderColor: `${config.accentColor}55`, color: config.accentColor }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          ) : null}

          {config.showDots && pageCount > 1 ? (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {Array.from({ length: pageCount }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Go to page ${index + 1}`}
                  onClick={() => setPage(index)}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: index === activePage ? 18 : 6,
                    backgroundColor: index === activePage ? config.accentColor : `${config.accentColor}40`,
                  }}
                />
              ))}
            </div>
          ) : null}
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

function MarqueeRow({
  config,
  reviews,
  direction,
}: {
  config: WidgetConfig;
  reviews: GoogleReview[];
  direction: 1 | -1;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const hoveredRef = useRef(false);
  const doubledReviews = useMemo(() => [...reviews, ...reviews], [reviews]);

  useEffect(() => {
    let frame = 0;
    let lastTime: number | null = null;

    const step = (time: number) => {
      const track = trackRef.current;
      if (track) {
        const halfWidth = track.scrollWidth / 2;
        if (lastTime !== null && !(config.pauseOnHover && hoveredRef.current) && halfWidth > 0) {
          const dt = (time - lastTime) / 1000;
          offsetRef.current += direction * config.marqueeSpeedPxPerSec * dt;
          offsetRef.current = ((offsetRef.current % halfWidth) + halfWidth) % halfWidth;
          track.style.transform = `translateX(${-offsetRef.current}px)`;
        }
      }
      lastTime = time;
      frame = window.requestAnimationFrame(step);
    };

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [config.marqueeSpeedPxPerSec, config.pauseOnHover, direction, doubledReviews.length]);

  return (
    <div
      className="overflow-hidden"
      onMouseEnter={() => {
        hoveredRef.current = true;
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
      }}
      onTouchStart={() => {
        hoveredRef.current = true;
      }}
      onTouchEnd={() => {
        hoveredRef.current = false;
      }}
    >
      <div ref={trackRef} className="flex w-max" style={{ gap: config.cardGap, willChange: "transform" }}>
        {doubledReviews.map((review, index) => (
          <div key={`${review.reviewId}-${review.reviewer.displayName}-${index}`} style={{ width: config.width ? undefined : 320, flex: "0 0 auto" }}>
            <div style={{ width: 320 }}>
              <ReviewCard config={config} review={review} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarqueeLayout({
  config,
  place,
  reviews,
}: {
  config: WidgetConfig;
  place: PlaceSummary;
  reviews: GoogleReview[];
}) {
  const visibleReviews = prepareReviews(reviews, config);
  // Two opposing-direction rows read as chaotic on narrow screens — collapse to one row there.
  const [singleRow, setSingleRow] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");
    const update = () => setSingleRow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const rows = singleRow ? 1 : config.marqueeRows;

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
      ) : (
        <div className="flex flex-col" style={{ gap: config.cardGap }}>
          {Array.from({ length: rows }).map((_, rowIndex) => {
            const direction: 1 | -1 =
              config.marqueeDirection === "alternate" && rowIndex % 2 === 1 ? -1 : 1;
            return <MarqueeRow key={rowIndex} config={config} reviews={visibleReviews} direction={direction} />;
          })}
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

function BadgeLayout({ config, place }: { config: WidgetConfig; place: PlaceSummary }) {
  return (
    <div
      className="inline-flex flex-col items-center gap-2 rounded-lg border p-5 text-center"
      style={{ backgroundColor: config.cardColor, borderColor: `${config.accentColor}33`, borderRadius: config.cardRadius }}
    >
      <GoogleMark variant={config.logoVariant} color={config.textColor} />
      <div className="text-3xl font-bold">{(place.averageRating ?? 0).toFixed(1)}</div>
      <StarRow rating={place.averageRating ?? 0} color={config.starColor} />
      {place.totalReviewCount ? (
        <div className="text-sm opacity-70">{place.totalReviewCount} reviews</div>
      ) : null}
      {place.profileUrl ? (
        <a
          href={place.profileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium"
          style={{ color: config.linkColor }}
        >
          {config.reviewButtonLabel || "Read all on Google"} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </div>
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
  const wrapperStyle: CSSProperties & { "--rgwb-card-min-height": string } = {
    backgroundColor: config.backgroundColor,
    color: config.textColor,
    fontFamily: FONT_STACKS[config.fontFamily],
    "--rgwb-card-min-height": `${config.cardMinHeight}px`,
  };

  if (!place || (!loading && reviews.length === 0 && config.layout !== "badge")) {
    return <EmptyWidget config={config} loading={loading} />;
  }

  return (
    <div
      className={`${embedded ? "h-full w-full overflow-hidden p-3" : "w-full"} ${
        config.equalHeightCards ? "rgwb-equal-height" : ""
      }`}
      style={wrapperStyle}
    >
      {config.layout === "badge" ? (
        <BadgeLayout config={config} place={place} />
      ) : config.layout === "carousel" ? (
        <CarouselLayout config={config} place={place} reviews={reviews} />
      ) : config.layout === "marquee" ? (
        <MarqueeLayout config={config} place={place} reviews={reviews} />
      ) : (
        <ReviewsLayout config={config} place={place} reviews={reviews} />
      )}
    </div>
  );
}
