# Google Reviews Widget Builder

A Next.js app for connecting Google Business Profile, loading managed-location reviews server-side, customizing a reviews widget, and generating an iframe embed code.

## Environment

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-business/auth/callback
```

Create an OAuth client in Google Cloud and enable the Google Business Profile APIs used by this app: Business Profile API / Google My Business API for locations and reviews, plus My Business Account Management API for account listing. The OAuth callback must match `GOOGLE_REDIRECT_URI`. For a Vercel deployment, set it to `https://your-domain.vercel.app/api/google-business/auth/callback`.

The OAuth consent screen requests `https://www.googleapis.com/auth/business.manage` so the app can list accounts, locations, and reviews for verified Google Business Profile locations.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Vercel

Connect a GitHub repository from `talkerstein-consulting`, set the environment variables above, and deploy. Vercel will auto-detect Next.js.

## Routes

- `/` - widget builder
- `/api/google-business/auth/start` - starts Google OAuth
- `/api/google-business/accounts` - lists accessible Business Profile accounts
- `/api/google-business/locations?accountName=accounts/...` - lists locations for an account
- `/api/google-business/reviews?locationName=accounts/.../locations/...` - loads reviews for a verified location
- `/embed?config=...` - iframe widget surface

Google Business Profile review access requires OAuth and a verified managed location. This local prototype stores OAuth tokens in an HTTP-only cookie; production public embeds should persist widgets and owner tokens server-side so visitors do not need to be connected to the owner's Google account.
