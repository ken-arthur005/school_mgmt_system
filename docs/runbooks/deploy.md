# Deploy (Sprint 0: API + web)

The API runs on **Render** (Docker, Frankfurt region). The staff web app runs on **Cloudflare Pages**.
The worker is not deployed until Sprint 8.

Do these in order: the web app needs the API's URL, and the API needs the web app's URL.

## 1. API on Render

1. In Render: **New → Blueprint**, pick this repository. Render reads `render.yaml` at the repo root.
2. When asked for the environment variables marked `sync: false`, set:
   - `APP_ENV` = `staging` (or `production` for the school's live system)
   - `CORS_ORIGINS` = a placeholder such as `https://example.com` for now (you fix it in step 3)
3. Deploy. Render builds `apps/api/Dockerfile` from the repo root and sets `PORT` itself.
4. Check: open `https://<your-api>.onrender.com/health`. You should see
   `{"status":"ok","env":"staging"}`.

`autoDeploy` is off: deploy from the Render dashboard (or turn it on once CI is trusted).

## 2. Web on Cloudflare Pages

1. **Workers & Pages → Create → Pages → Connect to Git**, pick this repository.
2. Build settings:
   - Framework preset: **None**
   - Build command: `npm install -g pnpm@12.5.1 && pnpm install --frozen-lockfile && pnpm --filter "@school-mgmt/web..." build`
   - Build output directory: `apps/web/dist`
   - Root directory: _(leave empty: the repo root)_
3. Environment variables (Production and Preview):
   - `NODE_VERSION` = `24`
   - `VITE_API_URL` = `https://<your-api>.onrender.com` (no trailing slash)
4. Deploy and note the Pages URL, e.g. `https://school-mgmt.pages.dev`.

`VITE_*` values are baked into the bundle at build time and are **public**. Never put secrets there.
Changing `VITE_API_URL` needs a new web build.

## 3. Connect them

1. In Render, set `CORS_ORIGINS` to the Pages URL (comma-separate several, e.g. a custom domain too):
   `https://school-mgmt.pages.dev,https://app.yourschool.edu.gh`
2. Redeploy the API.
3. Open the Pages URL on a phone. It should say **"API is healthy"**. This is the Sprint 0 "done" check.

## If it says "Can't reach the school server"

- Open `<api-url>/health` directly. If that fails, check the Render logs.
- If `/health` works directly but not from the page, the browser blocked it: `CORS_ORIGINS` must
  match the page's address exactly (scheme + host, no trailing slash).
- Free Render instances sleep when idle; the first request can take ~30 seconds.
