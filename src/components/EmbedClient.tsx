"use client";

import { useEffect, useMemo, useState } from "react";
import { ReviewWidget } from "@/components/ReviewWidget";
import type { PlaceReviewsPayload } from "@/lib/place-types";
import { decodeWidgetConfig } from "@/lib/widget-config";

type EmbedClientProps = {
  encodedConfig: string;
};

export function EmbedClient({ encodedConfig }: EmbedClientProps) {
  const config = useMemo(() => decodeWidgetConfig(encodedConfig), [encodedConfig]);
  const [data, setData] = useState<PlaceReviewsPayload | null>(null);
  const [loading, setLoading] = useState(Boolean(config.placeId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!config.placeId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      locationName: config.placeId,
      placeName: config.placeName,
      formattedAddress: config.formattedAddress,
      profileUrl: config.profileUrl,
    });

    setLoading(true);
    fetch(`/api/google-business/reviews?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load reviews.");
        }
        return response.json() as Promise<PlaceReviewsPayload>;
      })
      .then((payload) => {
        setData(payload);
        setError("");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("Reviews unavailable.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [config.formattedAddress, config.placeId, config.placeName, config.profileUrl]);

  return (
    <main className="min-h-screen" style={{ backgroundColor: config.backgroundColor }}>
      {error ? (
        <div className="flex min-h-screen items-center justify-center p-4 text-sm" style={{ color: config.textColor }}>
          {error}
        </div>
      ) : (
        <ReviewWidget config={config} data={data} loading={loading} embedded />
      )}
    </main>
  );
}
