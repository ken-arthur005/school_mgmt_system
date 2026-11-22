# Deploy (Sprint 0: API + web)

The API runs on **Render** (Docker, Frankfurt region). The staff web app runs as a
**Cloudflare Worker** that only serves the built files from `apps/web/dist` (no server code).
The worker app (`apps/worker`) is not deployed until Sprint 8.

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

## 2. Web on a Cloudflare Worker

The Worker's settings live in `apps/web/wrangler.jsonc`. The `name` there (`sch-mgmt-system`) must
match the Worker's name in the Cloudflare dashboard exactly. If you ever rename the Worker, change
the file too.

### First-time setup

1. **Workers & Pages → Create → Workers → Import a repository**, pick this repository
   (skip this if the `sch-mgmt-system` Worker already exists).
2. Open the Worker → **Settings → Build** and set:

   | Setting                      | Value                                                 |
   | ---------------------------- | ----------------------------------------------------- |
   | Root directory               | _(leave empty: the repo root)_                        |
   | Build command                | `pnpm --filter "@school-mgmt/web..." build`           |
   | Deploy command               | `cd apps/web && npx wrangler@4.166.0 deploy`          |
   | Non-production branch deploy | `cd apps/web && npx wrangler@4.166.0 versions upload` |

   The build runs from the repo root because the web app needs the workspace packages
   (`packages/shared`). Cloudflare picks up Node 24 from `.nvmrc` and pnpm from `package.json`.

3. Still in **Settings → Build**, under **Variables and secrets** (the _build_ variables, not the
   Worker's runtime variables), add:
   - `VITE_API_URL` = `https://<your-api>.onrender.com` (no trailing slash)

   This must be a **build** variable: Vite bakes it into the JavaScript while building. If it's
   missing, the build still succeeds but the page is blank, and the browser console shows
   `Invalid web environment`.

4. Trigger a deploy: push to `main`, or **Deployments → Retry build** on the latest one.
5. Note the URL: `https://sch-mgmt-system.<your-account>.workers.dev` (shown on the Worker's
   overview page).

### Checks

- The build log ends with `Uploaded sch-mgmt-system` and `Deployed sch-mgmt-system`.
- Opening the URL shows the School Manager page.
- `VITE_*` values are **public** (anyone can read them in the JavaScript). Never put secrets there.
- Changing `VITE_API_URL` needs a new build: retry the latest deployment after changing it.

## 3. Connect them

1. In Render, set `CORS_ORIGINS` to the Worker URL (comma-separate several, e.g. a custom domain too):
   `https://sch-mgmt-system.<your-account>.workers.dev,https://app.yourschool.edu.gh`
2. Redeploy the API.
3. Open the Worker URL on a phone. It should say **"API is healthy"**. This is the Sprint 0 "done"
   check.

## If something goes wrong

| What you see                                                                     | Cause and fix                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build log: `application detection logic has been run in the root of a workspace` | The deploy command doesn't start with `cd apps/web &&`. Fix it in **Settings → Build**.                                                                                                                                                 |
| Build log: Worker name mismatch                                                  | `name` in `apps/web/wrangler.jsonc` differs from the Worker's name in the dashboard. Make them the same.                                                                                                                                |
| Blank page; console says `Invalid web environment`                               | `VITE_API_URL` is missing from the **build** variables. Add it and retry the build.                                                                                                                                                     |
| Page says "Can't reach the school server"                                        | Open `<api-url>/health` directly. If that fails, check the Render logs. If it works directly but not from the page, the browser blocked it: `CORS_ORIGINS` must match the page's address exactly (`https://`, host, no trailing slash). |
| First load takes ~30 seconds                                                     | Free Render instances sleep when idle and need time to wake up.                                                                                                                                                                         |
