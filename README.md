# Google Reviews Widget Builder

A Next.js app for selecting a Google place, loading Google reviews server-side, customizing a reviews widget, and generating an iframe embed code.

## Environment

```bash
GOOGLE_PLACES_API_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

`GOOGLE_PLACES_API_KEY` is used by `/api/place` and should be configured in Vercel as a server-side environment variable. `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is used by the builder page for Google Places autocomplete. The same Google Cloud project can provide both keys, but the browser key should be restricted by HTTP referrer.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Vercel

Connect a GitHub repository from `talkerstein-consulting`, set the two environment variables above, and deploy. Vercel will auto-detect Next.js.

## Routes

- `/` - widget builder
- `/api/place?placeId=...` - server-side Google Places Details lookup
- `/embed?config=...` - iframe widget surface

Google Places returns a limited review set. For more than the Places API review limit, use a review aggregation source such as Featurable.
