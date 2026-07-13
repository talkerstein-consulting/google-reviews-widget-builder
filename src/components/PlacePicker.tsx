"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, LogOut, RefreshCw } from "lucide-react";

type PickedPlace = {
  placeId: string;
  name: string;
  formattedAddress: string;
  profileUrl?: string;
};

type PlacePickerProps = {
  value: string;
  onPick: (place: PickedPlace) => void;
};

type GoogleBusinessAccount = {
  name: string;
  accountName?: string;
  type?: string;
};

type GoogleBusinessLocation = {
  name: string;
  title?: string;
  locationName?: string;
  formattedAddress?: string;
  metadata?: {
    mapsUri?: string;
    mapsUrl?: string;
    newReviewUri?: string;
  };
};

type LoadState = "idle" | "loading" | "ready" | "error";

function accountLabel(account: GoogleBusinessAccount) {
  return account.accountName || account.name;
}

function locationLabel(location: GoogleBusinessLocation) {
  return location.title || location.locationName || location.name;
}

function profileUrl(location: GoogleBusinessLocation) {
  return location.metadata?.mapsUri || location.metadata?.mapsUrl || location.metadata?.newReviewUri || "";
}

export function PlacePicker({ value, onPick }: PlacePickerProps) {
  const [connected, setConnected] = useState(false);
  const [accounts, setAccounts] = useState<GoogleBusinessAccount[]>([]);
  const [locations, setLocations] = useState<GoogleBusinessLocation[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(value);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState("");

  const loadAccounts = useCallback(async () => {
    setState("loading");
    setError("");

    try {
      const response = await fetch("/api/google-business/accounts", { cache: "no-store" });
      if (response.status === 502 || response.status === 401) {
        throw new Error("Connect Google Business Profile to load accounts.");
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Unable to load Google Business Profile accounts.");
      }

      const payload = (await response.json()) as { accounts?: GoogleBusinessAccount[] };
      const nextAccounts = payload.accounts || [];
      setAccounts(nextAccounts);
      setConnected(true);
      setSelectedAccount((current) => current || nextAccounts[0]?.name || "");
      setState("ready");
    } catch (caught) {
      setAccounts([]);
      setLocations([]);
      setConnected(false);
      setState("error");
      setError(caught instanceof Error ? caught.message : "Unable to load Google Business Profile accounts.");
    }
  }, []);

  useEffect(() => {
    fetch("/api/google-business/status", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ connected?: boolean }>)
      .then((payload) => {
        setConnected(Boolean(payload.connected));
        if (payload.connected) {
          void loadAccounts();
        }
      })
      .catch(() => {
        setConnected(false);
      });
  }, [loadAccounts]);

  useEffect(() => {
    if (!selectedAccount) {
      setLocations([]);
      return;
    }

    const controller = new AbortController();
    setState("loading");
    setError("");

    fetch(`/api/google-business/locations?${new URLSearchParams({ accountName: selectedAccount })}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error || "Unable to load Google Business Profile locations.");
        }
        return response.json() as Promise<{ locations?: GoogleBusinessLocation[] }>;
      })
      .then((payload) => {
        const nextLocations = payload.locations || [];
        setLocations(nextLocations);
        setSelectedLocation((current) => {
          if (current && nextLocations.some((location) => location.name === current)) {
            return current;
          }
          return nextLocations[0]?.name || "";
        });
        setState("ready");
      })
      .catch((caught) => {
        if (controller.signal.aborted) {
          return;
        }
        setLocations([]);
        setState("error");
        setError(caught instanceof Error ? caught.message : "Unable to load Google Business Profile locations.");
      });

    return () => controller.abort();
  }, [selectedAccount]);

  useEffect(() => {
    const location = locations.find((item) => item.name === selectedLocation);
    if (!location) {
      return;
    }

    onPick({
      placeId: location.name,
      name: locationLabel(location),
      formattedAddress: location.formattedAddress || "",
      profileUrl: profileUrl(location),
    });
  }, [locations, onPick, selectedLocation]);

  async function disconnect() {
    await fetch("/api/google-business/auth/disconnect", { method: "POST" });
    setConnected(false);
    setAccounts([]);
    setLocations([]);
    setSelectedAccount("");
    setSelectedLocation("");
    setState("idle");
  }

  if (!connected) {
    return (
      <div className="space-y-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Google Business Profile</div>
          <div className="text-xs text-slate-500">OAuth connection for managed locations and full review lists.</div>
        </div>
        <a
          href="/api/google-business/auth/start"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Building2 className="h-4 w-4" />
          Connect Google Business
        </a>
        {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Google Business Profile</div>
          <div className="text-xs text-slate-500">{state === "loading" ? "Loading account data" : "Connected"}</div>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => void loadAccounts()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:bg-slate-100"
            aria-label="Refresh Google Business Profile accounts"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void disconnect()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:bg-slate-100"
            aria-label="Disconnect Google Business Profile"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Account
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
          value={selectedAccount}
          onChange={(event) => setSelectedAccount(event.target.value)}
          disabled={accounts.length === 0}
        >
          {accounts.map((account) => (
            <option key={account.name} value={account.name}>
              {accountLabel(account)}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Location
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
          value={selectedLocation}
          onChange={(event) => setSelectedLocation(event.target.value)}
          disabled={locations.length === 0}
        >
          {locations.map((location) => (
            <option key={location.name} value={location.name}>
              {locationLabel(location)}
            </option>
          ))}
        </select>
      </label>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}
    </div>
  );
}
