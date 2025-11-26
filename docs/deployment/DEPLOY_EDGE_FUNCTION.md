# Deploying the AI Search Edge Function

To enable the You.com integration, you need to deploy the new Edge Function to your Supabase project.

## Prerequisites

1. Ensure you have the Supabase CLI installed and logged in.
1. Ensure you have set the `YOUCOM_API_KEY` in your Supabase project secrets.

### Configure `YOUCOM_API_KEY`

Add your You.com API token everywhere the Edge Function runs so it can reach the search API:

1. **Supabase project secret** (required for production and previews)

   ```bash
   npx supabase secrets set YOUCOM_API_KEY=sk_live_your_youcom_key
   ```

   You can also set this inside the Supabase Dashboard → **Settings → API → Edge Functions → Secrets**.

1. **Local development**

   Add the same key to your local `.env` file so `scripts/validate-env.js` and the Supabase CLI pick it up:

   ```env
   YOUCOM_API_KEY=sk_live_your_youcom_key
   ```

1. After updating secrets, redeploy (or restart `supabase functions serve`) so the Edge Function reloads the environment.

## Deployment Steps

### Supported modes

The `ai-search` Edge Function accepts the following payload shape:

```json
{
   "query": "string",
   "mode": "search" | "news" | "images" | "rag",
   "count": 1-25 (optional)
}
```

- `search` (default) returns general web sources under `hits`.
- `news` returns breaking coverage with `news` entries.
- `images` fetches rich previews for citations and doc inserts.
- `rag` triggers You.com's retrieval-augmented answer block (`qa.answer`).

If `count` is omitted the function defaults to 5 items (8 for images). Responses include normalized fields (`hits`, `news`, `images`, `qa`, and `metadata`) so every client receives a consistent payload regardless of the upstream endpoint.

1. Open a terminal in the project root.
1. Run the following command:

```bash
npx supabase functions deploy ai-search
```

1. If prompted, select your Supabase project.

## Verification

After deployment, you can test the function from the Supabase Dashboard or by using the "Web Search" toggle in the AI Command Palette within the application.
