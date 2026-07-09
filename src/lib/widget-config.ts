export type WidgetLayout = "carousel" | "badge" | "grid" | "list" | "masonry";
export type WidgetTheme = "light" | "dark";
export type ReviewVariant = "card" | "testimonial";
export type WidgetTemplate = "classic" | "bubble" | "spotlight";
export type NameDisplay = "fullNames" | "firstAndLastInitials" | "firstNamesOnly";
export type DateDisplay = "relative" | "absolute" | "none";
export type LogoVariant = "icon" | "full" | "none";
export type ReviewSort = "newest" | "highest" | "lowest";

export type WidgetConfig = {
  placeId: string;
  placeName: string;
  formattedAddress: string;
  layout: WidgetLayout;
  theme: WidgetTheme;
  reviewVariant: ReviewVariant;
  template: WidgetTemplate;
  nameDisplay: NameDisplay;
  dateDisplay: DateDisplay;
  logoVariant: LogoVariant;
  customTitle: string;
  showHeader: boolean;
  showAddress: boolean;
  showRatingSummary: boolean;
  showReviewButton: boolean;
  reviewButtonLabel: string;
  minRating: number;
  reviewSort: ReviewSort;
  excludeKeywords: string;
  excludeReviewers: string;
  showReviewerPhoto: boolean;
  maxCharacters: number;
  maxItems: number;
  columns: number;
  rows: number;
  equalHeightCards: boolean;
  cardMinHeight: number;
  carouselAutoplay: boolean;
  carouselSpeed: number;
  showDots: boolean;
  hideEmptyReviews: boolean;
  disableTranslation: boolean;
  accentColor: string;
  backgroundColor: string;
  cardColor: string;
  textColor: string;
  starColor: string;
  linkColor: string;
  buttonColor: string;
  cardRadius: number;
  cardGap: number;
  titleFontSize: number;
  reviewFontSize: number;
  width: number;
  height: number;
};

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  placeId: "",
  placeName: "",
  formattedAddress: "",
  layout: "carousel",
  theme: "light",
  reviewVariant: "card",
  template: "classic",
  nameDisplay: "firstAndLastInitials",
  dateDisplay: "relative",
  logoVariant: "icon",
  customTitle: "",
  showHeader: true,
  showAddress: false,
  showRatingSummary: true,
  showReviewButton: true,
  reviewButtonLabel: "Write a review",
  minRating: 1,
  reviewSort: "newest",
  excludeKeywords: "",
  excludeReviewers: "",
  showReviewerPhoto: true,
  maxCharacters: 220,
  maxItems: 3,
  columns: 3,
  rows: 1,
  equalHeightCards: true,
  cardMinHeight: 220,
  carouselAutoplay: true,
  carouselSpeed: 4000,
  showDots: true,
  hideEmptyReviews: true,
  disableTranslation: false,
  accentColor: "#0f766e",
  backgroundColor: "#f7f8fb",
  cardColor: "#ffffff",
  textColor: "#172033",
  starColor: "#f59e0b",
  linkColor: "#0f766e",
  buttonColor: "#0f766e",
  cardRadius: 8,
  cardGap: 12,
  titleFontSize: 22,
  reviewFontSize: 14,
  width: 960,
  height: 460,
};

const colorPattern = /^#[0-9a-fA-F]{6}$/;

function clamp(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function pick<T extends string>(value: unknown, options: readonly T[], fallback: T) {
  return options.includes(value as T) ? (value as T) : fallback;
}

function color(value: unknown, fallback: string) {
  return typeof value === "string" && colorPattern.test(value) ? value : fallback;
}

function text(value: unknown, fallback: string, maxLength = 160) {
  return typeof value === "string" ? value.slice(0, maxLength) : fallback;
}

export function normalizeWidgetConfig(value: Partial<WidgetConfig> | null | undefined): WidgetConfig {
  const input = value ?? {};

  return {
    placeId: typeof input.placeId === "string" ? input.placeId : DEFAULT_WIDGET_CONFIG.placeId,
    placeName: typeof input.placeName === "string" ? input.placeName : DEFAULT_WIDGET_CONFIG.placeName,
    formattedAddress:
      typeof input.formattedAddress === "string" ? input.formattedAddress : DEFAULT_WIDGET_CONFIG.formattedAddress,
    layout: pick(input.layout, ["carousel", "badge", "grid", "list", "masonry"] as const, DEFAULT_WIDGET_CONFIG.layout),
    theme: pick(input.theme, ["light", "dark"] as const, DEFAULT_WIDGET_CONFIG.theme),
    reviewVariant: pick(input.reviewVariant, ["card", "testimonial"] as const, DEFAULT_WIDGET_CONFIG.reviewVariant),
    template: pick(input.template, ["classic", "bubble", "spotlight"] as const, DEFAULT_WIDGET_CONFIG.template),
    nameDisplay: pick(
      input.nameDisplay,
      ["fullNames", "firstAndLastInitials", "firstNamesOnly"] as const,
      DEFAULT_WIDGET_CONFIG.nameDisplay,
    ),
    dateDisplay: pick(input.dateDisplay, ["relative", "absolute", "none"] as const, DEFAULT_WIDGET_CONFIG.dateDisplay),
    logoVariant: pick(input.logoVariant, ["icon", "full", "none"] as const, DEFAULT_WIDGET_CONFIG.logoVariant),
    customTitle: text(input.customTitle, DEFAULT_WIDGET_CONFIG.customTitle, 120),
    showHeader: typeof input.showHeader === "boolean" ? input.showHeader : DEFAULT_WIDGET_CONFIG.showHeader,
    showAddress: typeof input.showAddress === "boolean" ? input.showAddress : DEFAULT_WIDGET_CONFIG.showAddress,
    showRatingSummary:
      typeof input.showRatingSummary === "boolean" ? input.showRatingSummary : DEFAULT_WIDGET_CONFIG.showRatingSummary,
    showReviewButton:
      typeof input.showReviewButton === "boolean" ? input.showReviewButton : DEFAULT_WIDGET_CONFIG.showReviewButton,
    reviewButtonLabel: text(input.reviewButtonLabel, DEFAULT_WIDGET_CONFIG.reviewButtonLabel, 40),
    minRating: clamp(input.minRating, DEFAULT_WIDGET_CONFIG.minRating, 1, 5),
    reviewSort: pick(input.reviewSort, ["newest", "highest", "lowest"] as const, DEFAULT_WIDGET_CONFIG.reviewSort),
    excludeKeywords: text(input.excludeKeywords, DEFAULT_WIDGET_CONFIG.excludeKeywords, 300),
    excludeReviewers: text(input.excludeReviewers, DEFAULT_WIDGET_CONFIG.excludeReviewers, 300),
    showReviewerPhoto:
      typeof input.showReviewerPhoto === "boolean" ? input.showReviewerPhoto : DEFAULT_WIDGET_CONFIG.showReviewerPhoto,
    maxCharacters: clamp(input.maxCharacters, DEFAULT_WIDGET_CONFIG.maxCharacters, 80, 800),
    maxItems: clamp(input.maxItems, DEFAULT_WIDGET_CONFIG.maxItems, 1, 5),
    columns: clamp(input.columns, DEFAULT_WIDGET_CONFIG.columns, 1, 4),
    rows: clamp(input.rows, DEFAULT_WIDGET_CONFIG.rows, 1, 4),
    equalHeightCards:
      typeof input.equalHeightCards === "boolean" ? input.equalHeightCards : DEFAULT_WIDGET_CONFIG.equalHeightCards,
    cardMinHeight: clamp(input.cardMinHeight, DEFAULT_WIDGET_CONFIG.cardMinHeight, 120, 520),
    carouselAutoplay:
      typeof input.carouselAutoplay === "boolean"
        ? input.carouselAutoplay
        : DEFAULT_WIDGET_CONFIG.carouselAutoplay,
    carouselSpeed: clamp(input.carouselSpeed, DEFAULT_WIDGET_CONFIG.carouselSpeed, 1000, 12000),
    showDots: typeof input.showDots === "boolean" ? input.showDots : DEFAULT_WIDGET_CONFIG.showDots,
    hideEmptyReviews:
      typeof input.hideEmptyReviews === "boolean" ? input.hideEmptyReviews : DEFAULT_WIDGET_CONFIG.hideEmptyReviews,
    disableTranslation:
      typeof input.disableTranslation === "boolean"
        ? input.disableTranslation
        : DEFAULT_WIDGET_CONFIG.disableTranslation,
    accentColor: color(input.accentColor, DEFAULT_WIDGET_CONFIG.accentColor),
    backgroundColor: color(input.backgroundColor, DEFAULT_WIDGET_CONFIG.backgroundColor),
    cardColor: color(input.cardColor, DEFAULT_WIDGET_CONFIG.cardColor),
    textColor: color(input.textColor, DEFAULT_WIDGET_CONFIG.textColor),
    starColor: color(input.starColor, DEFAULT_WIDGET_CONFIG.starColor),
    linkColor: color(input.linkColor, DEFAULT_WIDGET_CONFIG.linkColor),
    buttonColor: color(input.buttonColor, DEFAULT_WIDGET_CONFIG.buttonColor),
    cardRadius: clamp(input.cardRadius, DEFAULT_WIDGET_CONFIG.cardRadius, 0, 32),
    cardGap: clamp(input.cardGap, DEFAULT_WIDGET_CONFIG.cardGap, 4, 40),
    titleFontSize: clamp(input.titleFontSize, DEFAULT_WIDGET_CONFIG.titleFontSize, 14, 42),
    reviewFontSize: clamp(input.reviewFontSize, DEFAULT_WIDGET_CONFIG.reviewFontSize, 11, 24),
    width: clamp(input.width, DEFAULT_WIDGET_CONFIG.width, 280, 1800),
    height: clamp(input.height, DEFAULT_WIDGET_CONFIG.height, 180, 1200),
  };
}

export function encodeWidgetConfig(config: WidgetConfig) {
  const json = JSON.stringify(normalizeWidgetConfig(config));
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeWidgetConfig(encoded: string) {
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return normalizeWidgetConfig(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return normalizeWidgetConfig(null);
  }
}

export function buildEmbedUrl(origin: string, config: WidgetConfig) {
  return `${origin.replace(/\/+$/g, "")}/embed?config=${encodeWidgetConfig(config)}`;
}
