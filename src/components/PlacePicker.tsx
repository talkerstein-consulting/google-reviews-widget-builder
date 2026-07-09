"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { MapPin, Search } from "lucide-react";

type PickedPlace = {
  placeId: string;
  name: string;
  formattedAddress: string;
};

type PlacePickerProps = {
  value: string;
  onPick: (place: PickedPlace) => void;
};

const browserApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function PlacePicker({ value, onPick }: PlacePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [manualPlaceId, setManualPlaceId] = useState(value);
  const [autocompleteReady, setAutocompleteReady] = useState(false);
  const [autocompleteError, setAutocompleteError] = useState("");

  useEffect(() => {
    setManualPlaceId(value);
  }, [value]);

  useEffect(() => {
    if (!browserApiKey || !inputRef.current) {
      return;
    }

    let listener: google.maps.MapsEventListener | null = null;
    let cancelled = false;

    setOptions({
      key: browserApiKey,
      v: "weekly",
      libraries: ["places"],
    });

    importLibrary("places")
      .then((places) => {
        if (cancelled || !inputRef.current) {
          return;
        }

        const autocomplete = new places.Autocomplete(inputRef.current, {
          fields: ["place_id", "name", "formatted_address"],
        });

        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place.place_id) {
            return;
          }

          onPick({
            placeId: place.place_id,
            name: place.name || "Selected place",
            formattedAddress: place.formatted_address || "",
          });
        });

        setAutocompleteReady(true);
      })
      .catch(() => {
        setAutocompleteError("Google Places autocomplete could not load.");
      });

    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, [onPick]);

  function submitManualPlaceId() {
    const placeId = manualPlaceId.trim();
    if (!placeId) {
      return;
    }

    onPick({
      placeId,
      name: "Selected place",
      formattedAddress: "",
    });
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700" htmlFor="google-place-search">
        Google place
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          id="google-place-search"
          className="h-11 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
          placeholder={browserApiKey ? "Search Google Maps places" : "Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"}
          type="search"
          disabled={!browserApiKey}
        />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-3 font-mono text-xs text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
          value={manualPlaceId}
          onChange={(event) => setManualPlaceId(event.target.value)}
          placeholder="Place ID"
        />
        <button
          type="button"
          onClick={submitManualPlaceId}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <MapPin className="h-4 w-4" />
          Load
        </button>
      </div>

      <div className="text-xs text-slate-500">
        {autocompleteReady
          ? "Autocomplete ready"
          : autocompleteError || "Manual Place ID entry works with only the server key configured."}
      </div>
    </div>
  );
}
