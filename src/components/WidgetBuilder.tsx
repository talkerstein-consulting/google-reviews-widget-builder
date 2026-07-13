"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Code2, Eye, Palette, Settings2 } from "lucide-react";
import { PlacePicker } from "@/components/PlacePicker";
import { ReviewWidget } from "@/components/ReviewWidget";
import type { PlaceReviewsPayload } from "@/lib/place-types";
import {
  buildEmbedUrl,
  DEFAULT_WIDGET_CONFIG,
  normalizeWidgetConfig,
  STYLE_PRESETS,
  type WidgetConfig,
  type WidgetLayout,
} from "@/lib/widget-config";

type FetchState = "idle" | "loading" | "ready" | "error";

function updateConfig(config: WidgetConfig, patch: Partial<WidgetConfig>) {
  return normalizeWidgetConfig({ ...config, ...patch });
}

function SelectControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <select
        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <input
        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function ToggleControl({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
      {label}
      <input
        className="h-4 w-4 accent-teal-700"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <span className="grid h-10 grid-cols-[2.5rem_1fr] overflow-hidden rounded-md border border-slate-300 bg-white">
        <input
          className="h-10 w-10 cursor-pointer border-0 p-1"
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          className="min-w-0 px-3 font-mono text-xs text-slate-950 outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

function TextControl({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <input
        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function LayoutButton({
  layout,
  active,
  onClick,
}: {
  layout: WidgetLayout;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-md px-3 text-sm font-medium transition ${
        active ? "bg-slate-950 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
      }`}
    >
      {layout.charAt(0).toUpperCase() + layout.slice(1)}
    </button>
  );
}

export function WidgetBuilder() {
  const [config, setConfig] = useState(DEFAULT_WIDGET_CONFIG);
  const [data, setData] = useState<PlaceReviewsPayload | null>(null);
  const [state, setState] = useState<FetchState>("idle");
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("https://your-vercel-domain.vercel.app");
  const [copied, setCopied] = useState(false);
  const selectedLocationMetadataRef = useRef({
    placeName: "",
    formattedAddress: "",
    profileUrl: "",
  });

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const setPatch = useCallback((patch: Partial<WidgetConfig>) => {
    setConfig((current) => updateConfig(current, patch));
  }, []);

  useEffect(() => {
    selectedLocationMetadataRef.current = {
      placeName: config.placeName,
      formattedAddress: config.formattedAddress,
      profileUrl: config.profileUrl,
    };
  }, [config.formattedAddress, config.placeName, config.profileUrl]);

  useEffect(() => {
    if (!config.placeId) {
      setData(null);
      setState("idle");
      return;
    }

    const controller = new AbortController();
    const metadata = selectedLocationMetadataRef.current;
    const params = new URLSearchParams({
      locationName: config.placeId,
      placeName: metadata.placeName,
      formattedAddress: metadata.formattedAddress,
      profileUrl: metadata.profileUrl,
    });

    setState("loading");
    setError("");

    fetch(`/api/google-business/reviews?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error || "Unable to load reviews.");
        }
        return response.json() as Promise<PlaceReviewsPayload>;
      })
      .then((payload) => {
        setData(payload);
        setState("ready");
        setConfig((current) =>
          updateConfig(current, {
            placeName: payload.place.name,
            formattedAddress: payload.place.formattedAddress,
            profileUrl: payload.place.profileUrl || current.profileUrl,
          }),
        );
      })
      .catch((caught: Error) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(caught.message);
        setData(null);
        setState("error");
      });

    return () => controller.abort();
  }, [config.placeId]);

  const embedUrl = useMemo(() => buildEmbedUrl(origin, config), [config, origin]);
  const iframeCode = useMemo(() => {
    const title = `${config.placeName || "Google"} reviews`;
    return `<iframe src="${embedUrl}" width="${config.width}" height="${config.height}" style="border:0;max-width:100%;width:${config.width}px;height:${config.height}px;" loading="lazy" title="${title}"></iframe>`;
  }, [config.height, config.placeName, config.width, embedUrl]);

  async function copyCode() {
    await navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <div className="grid min-h-screen xl:grid-cols-[390px_1fr_420px]">
        <aside className="border-r border-slate-200 bg-white p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-normal">Reviews widget builder</h1>
              <p className="text-sm text-slate-500">Google Business Profile iframe generator</p>
            </div>
            <Settings2 className="h-5 w-5 text-teal-700" />
          </div>

          <div className="space-y-6">
            <PlacePicker
              value={config.placeId}
              onPick={(place) =>
                setPatch({
                  placeId: place.placeId,
                  placeName: place.name,
                  formattedAddress: place.formattedAddress,
                  profileUrl: place.profileUrl || "",
                })
              }
            />

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Eye className="h-4 w-4 text-teal-700" />
                Layout
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
                {(["carousel", "marquee", "grid", "list", "masonry", "badge"] as const).map((layout) => (
                  <LayoutButton
                    key={layout}
                    layout={layout}
                    active={config.layout === layout}
                    onClick={() => setPatch({ layout })}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SelectControl
                  label="Theme"
                  value={config.theme}
                  onChange={(theme) => setPatch({ theme })}
                  options={[
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                  ]}
                />
                <SelectControl
                  label="Cards"
                  value={config.reviewVariant}
                  onChange={(reviewVariant) => setPatch({ reviewVariant })}
                  options={[
                    { value: "card", label: "Card" },
                    { value: "testimonial", label: "Testimonial" },
                  ]}
                />
                <SelectControl
                  label="Template"
                  value={config.template}
                  onChange={(template) => setPatch({ template })}
                  options={[
                    { value: "classic", label: "Classic" },
                    { value: "bubble", label: "Bubble" },
                    { value: "spotlight", label: "Spotlight" },
                  ]}
                />
                <NumberControl
                  label="Columns"
                  value={config.columns}
                  min={1}
                  max={4}
                  onChange={(columns) => setPatch({ columns })}
                />
                <NumberControl
                  label="Rows"
                  value={config.rows}
                  min={1}
                  max={4}
                  onChange={(rows) => setPatch({ rows })}
                />
                <NumberControl
                  label="Card height"
                  value={config.cardMinHeight}
                  min={120}
                  max={520}
                  step={10}
                  onChange={(cardMinHeight) => setPatch({ cardMinHeight })}
                />
              </div>
              <ToggleControl
                label="Equal height cards"
                checked={config.equalHeightCards}
                onChange={(equalHeightCards) => setPatch({ equalHeightCards })}
              />
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Palette className="h-4 w-4 text-teal-700" />
                Style
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPatch(STYLE_PRESETS.light)}
                  className="h-9 rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Light preset
                </button>
                <button
                  type="button"
                  onClick={() => setPatch(STYLE_PRESETS.dark)}
                  className="h-9 rounded-md border border-slate-300 bg-slate-950 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Dark preset
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ColorControl label="Accent" value={config.accentColor} onChange={(accentColor) => setPatch({ accentColor })} />
                <ColorControl label="Canvas" value={config.backgroundColor} onChange={(backgroundColor) => setPatch({ backgroundColor })} />
                <ColorControl label="Card" value={config.cardColor} onChange={(cardColor) => setPatch({ cardColor })} />
                <ColorControl label="Text" value={config.textColor} onChange={(textColor) => setPatch({ textColor })} />
                <ColorControl label="Stars" value={config.starColor} onChange={(starColor) => setPatch({ starColor })} />
                <ColorControl label="Links" value={config.linkColor} onChange={(linkColor) => setPatch({ linkColor })} />
                <ColorControl label="Button" value={config.buttonColor} onChange={(buttonColor) => setPatch({ buttonColor })} />
                <NumberControl label="Radius" value={config.cardRadius} min={0} max={32} onChange={(cardRadius) => setPatch({ cardRadius })} />
                <NumberControl label="Gap" value={config.cardGap} min={4} max={40} onChange={(cardGap) => setPatch({ cardGap })} />
                <NumberControl
                  label="Title size"
                  value={config.titleFontSize}
                  min={14}
                  max={42}
                  onChange={(titleFontSize) => setPatch({ titleFontSize })}
                />
                <NumberControl
                  label="Review size"
                  value={config.reviewFontSize}
                  min={11}
                  max={24}
                  onChange={(reviewFontSize) => setPatch({ reviewFontSize })}
                />
                <SelectControl
                  label="Font"
                  value={config.fontFamily}
                  onChange={(fontFamily) => setPatch({ fontFamily })}
                  options={[
                    { value: "inherit", label: "Inherit from page" },
                    { value: "sans", label: "Sans" },
                    { value: "serif", label: "Serif" },
                    { value: "mono", label: "Mono" },
                  ]}
                />
              </div>
            </section>

            <section className="space-y-3">
              <div className="text-sm font-semibold text-slate-900">Header</div>
              <TextControl
                label="Custom title"
                value={config.customTitle}
                placeholder="Defaults to place name"
                onChange={(customTitle) => setPatch({ customTitle })}
              />
              <TextControl
                label="Review button"
                value={config.reviewButtonLabel}
                onChange={(reviewButtonLabel) => setPatch({ reviewButtonLabel })}
              />
              <div className="grid gap-2">
                <ToggleControl label="Show header" checked={config.showHeader} onChange={(showHeader) => setPatch({ showHeader })} />
                <ToggleControl label="Show address" checked={config.showAddress} onChange={(showAddress) => setPatch({ showAddress })} />
                <ToggleControl
                  label="Show rating summary"
                  checked={config.showRatingSummary}
                  onChange={(showRatingSummary) => setPatch({ showRatingSummary })}
                />
                <ToggleControl
                  label="Show review button"
                  checked={config.showReviewButton}
                  onChange={(showReviewButton) => setPatch({ showReviewButton })}
                />
              </div>
            </section>

            <section className="space-y-3">
              <div className="text-sm font-semibold text-slate-900">Content</div>
              <div className="grid grid-cols-2 gap-3">
                <SelectControl
                  label="Names"
                  value={config.nameDisplay}
                  onChange={(nameDisplay) => setPatch({ nameDisplay })}
                  options={[
                    { value: "firstAndLastInitials", label: "First + initial" },
                    { value: "firstNamesOnly", label: "First only" },
                    { value: "fullNames", label: "Full names" },
                  ]}
                />
                <SelectControl
                  label="Dates"
                  value={config.dateDisplay}
                  onChange={(dateDisplay) => setPatch({ dateDisplay })}
                  options={[
                    { value: "relative", label: "Relative" },
                    { value: "absolute", label: "Absolute" },
                    { value: "none", label: "Hidden" },
                  ]}
                />
                <SelectControl
                  label="Google mark"
                  value={config.logoVariant}
                  onChange={(logoVariant) => setPatch({ logoVariant })}
                  options={[
                    { value: "icon", label: "Icon" },
                    { value: "full", label: "Full" },
                  ]}
                />
                <NumberControl
                  label="Characters"
                  value={config.maxCharacters}
                  min={80}
                  max={800}
                  onChange={(maxCharacters) => setPatch({ maxCharacters })}
                />
                <NumberControl
                  label="Reviews"
                  value={config.maxItems}
                  min={1}
                  max={5}
                  onChange={(maxItems) => setPatch({ maxItems })}
                />
              </div>
              <div className="grid gap-2">
                <ToggleControl label="Hide empty reviews" checked={config.hideEmptyReviews} onChange={(hideEmptyReviews) => setPatch({ hideEmptyReviews })} />
                <ToggleControl
                  label="Show reviewer photos"
                  checked={config.showReviewerPhoto}
                  onChange={(showReviewerPhoto) => setPatch({ showReviewerPhoto })}
                />
              </div>
            </section>

            <section className="space-y-3">
              <div className="text-sm font-semibold text-slate-900">Filters</div>
              <div className="grid grid-cols-2 gap-3">
                <NumberControl
                  label="Minimum rating"
                  value={config.minRating}
                  min={1}
                  max={5}
                  onChange={(minRating) => setPatch({ minRating })}
                />
                <SelectControl
                  label="Sort"
                  value={config.reviewSort}
                  onChange={(reviewSort) => setPatch({ reviewSort })}
                  options={[
                    { value: "newest", label: "Newest" },
                    { value: "highest", label: "Highest" },
                    { value: "lowest", label: "Lowest" },
                  ]}
                />
              </div>
              <TextControl
                label="Exclude keywords"
                value={config.excludeKeywords}
                placeholder="comma, separated"
                onChange={(excludeKeywords) => setPatch({ excludeKeywords })}
              />
              <TextControl
                label="Exclude reviewers"
                value={config.excludeReviewers}
                placeholder="comma, separated"
                onChange={(excludeReviewers) => setPatch({ excludeReviewers })}
              />
            </section>

            <section className="space-y-3">
              <div className="text-sm font-semibold text-slate-900">Carousel</div>
              <div className="grid grid-cols-2 gap-3">
                <NumberControl
                  label="Speed"
                  value={config.carouselSpeed}
                  min={1000}
                  max={12000}
                  step={500}
                  onChange={(carouselSpeed) => setPatch({ carouselSpeed })}
                />
              </div>
              <div className="grid gap-2">
                <ToggleControl label="Autoplay" checked={config.carouselAutoplay} onChange={(carouselAutoplay) => setPatch({ carouselAutoplay })} />
                <ToggleControl label="Dots" checked={config.showDots} onChange={(showDots) => setPatch({ showDots })} />
              </div>
            </section>

            <section className="space-y-3">
              <div className="text-sm font-semibold text-slate-900">Marquee</div>
              <div className="grid grid-cols-2 gap-3">
                <NumberControl
                  label="Rows"
                  value={config.marqueeRows}
                  min={1}
                  max={2}
                  onChange={(marqueeRows) => setPatch({ marqueeRows })}
                />
                <NumberControl
                  label="Speed (px/s)"
                  value={config.marqueeSpeedPxPerSec}
                  min={5}
                  max={200}
                  step={5}
                  onChange={(marqueeSpeedPxPerSec) => setPatch({ marqueeSpeedPxPerSec })}
                />
                <SelectControl
                  label="Row direction"
                  value={config.marqueeDirection}
                  onChange={(marqueeDirection) => setPatch({ marqueeDirection })}
                  options={[
                    { value: "alternate", label: "Alternate" },
                    { value: "same", label: "Same" },
                  ]}
                />
              </div>
              <ToggleControl
                label="Pause on hover / touch"
                checked={config.pauseOnHover}
                onChange={(pauseOnHover) => setPatch({ pauseOnHover })}
              />
            </section>
          </div>
        </aside>

        <section className="min-w-0 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-500">{config.formattedAddress || "No address loaded"}</div>
              <h2 className="text-2xl font-semibold tracking-normal">{config.placeName || "Preview"}</h2>
            </div>
            <div
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                state === "error"
                  ? "bg-red-100 text-red-700"
                  : state === "ready"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-700"
              }`}
            >
              {state}
            </div>
          </div>

          {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

          <div
            className="min-h-[520px] overflow-hidden rounded-lg border border-slate-200 p-4 shadow-sm"
            style={{ backgroundColor: config.backgroundColor }}
          >
            <ReviewWidget config={config} data={data} loading={state === "loading"} />
          </div>
        </section>

        <aside className="border-l border-slate-200 bg-white p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-normal">Embed</h2>
              <p className="text-sm text-slate-500">Iframe output</p>
            </div>
            <Code2 className="h-5 w-5 text-teal-700" />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumberControl label="Width" value={config.width} min={280} max={1800} onChange={(width) => setPatch({ width })} />
              <NumberControl label="Height" value={config.height} min={180} max={1200} onChange={(height) => setPatch({ height })} />
            </div>

            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Iframe code
              <textarea
                className="min-h-48 resize-none rounded-md border border-slate-300 bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-50 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                value={iframeCode}
                readOnly
              />
            </label>

            <button
              type="button"
              onClick={copyCode}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy embed code"}
            </button>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="mb-1 text-sm font-semibold text-slate-900">Vercel env vars</div>
              <div className="space-y-1 font-mono text-xs text-slate-600">
                <div>GOOGLE_CLIENT_ID</div>
                <div>GOOGLE_CLIENT_SECRET</div>
                <div>GOOGLE_REDIRECT_URI</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
