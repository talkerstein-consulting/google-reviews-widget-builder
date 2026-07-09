export type WidgetLayout = "carousel" | "badge" | "grid";
export type WidgetTheme = "light" | "dark";
export type ReviewVariant = "card" | "testimonial";
export type NameDisplay = "fullNames" | "firstAndLastInitials" | "firstNamesOnly";
export type DateDisplay = "relative" | "absolute" | "none";
export type LogoVariant = "icon" | "full" | "none";

export type WidgetConfig = {
  placeId: string;
  placeName: string;
  formattedAddress: string;
  layout: WidgetLayout;
  theme: WidgetTheme;
  reviewVariant: ReviewVariant;
  nameDisplay: NameDisplay;
  dateDisplay: DateDisplay;
  logoVariant: LogoVariant;
  maxCharacters: number;
  maxItems: number;
  carouselAutoplay: boolean;
  carouselSpeed: number;
  showDots: boolean;
  hideEmptyReviews: boolean;
  disableTranslation: boolean;
  accentColor: string;
  backgroundColor: string;
  cardColor: string;
  textColor: string;
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
  nameDisplay: "firstAndLastInitials",
  dateDisplay: "relative",
  logoVariant: "icon",
  maxCharacters: 220,
  maxItems: 3,
  carouselAutoplay: true,
  carouselSpeed: 4000,
  showDots: true,
  hideEmptyReviews: true,
  disableTranslation: false,
  accentColor: "#0f766e",
  backgroundColor: "#f7f8fb",
  cardColor: "#ffffff",
  textColor: "#172033",
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

export function normalizeWidgetConfig(value: Partial<WidgetConfig> | null | undefined): WidgetConfig {
  const input = value ?? {};

  return {
    placeId: typeof input.placeId === "string" ? input.placeId : DEFAULT_WIDGET_CONFIG.placeId,
    placeName: typeof input.placeName === "string" ? input.placeName : DEFAULT_WIDGET_CONFIG.placeName,
    formattedAddress:
      typeof input.formattedAddress === "string" ? input.formattedAddress : DEFAULT_WIDGET_CONFIG.formattedAddress,
    layout: pick(input.layout, ["carousel", "badge", "grid"] as const, DEFAULT_WIDGET_CONFIG.layout),
    theme: pick(input.theme, ["light", "dark"] as const, DEFAULT_WIDGET_CONFIG.theme),
    reviewVariant: pick(input.reviewVariant, ["card", "testimonial"] as const, DEFAULT_WIDGET_CONFIG.reviewVariant),
    nameDisplay: pick(
      input.nameDisplay,
      ["fullNames", "firstAndLastInitials", "firstNamesOnly"] as const,
      DEFAULT_WIDGET_CONFIG.nameDisplay,
    ),
    dateDisplay: pick(input.dateDisplay, ["relative", "absolute", "none"] as const, DEFAULT_WIDGET_CONFIG.dateDisplay),
    logoVariant: pick(input.logoVariant, ["icon", "full", "none"] as const, DEFAULT_WIDGET_CONFIG.logoVariant),
    maxCharacters: clamp(input.maxCharacters, DEFAULT_WIDGET_CONFIG.maxCharacters, 80, 800),
    maxItems: clamp(input.maxItems, DEFAULT_WIDGET_CONFIG.maxItems, 1, 5),
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
