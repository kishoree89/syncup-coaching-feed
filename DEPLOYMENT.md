# SYNCUP — Deployment Guide

How to deploy the SYNCUP realtime coaching feed end-to-end using **free tiers** of
managed providers:

| Layer       | Provider                  | Cost     |
| ----------- | ------------------------- | -------- |
| PostgreSQL  | [Neon](https://neon.tech) | Free     |
| Redis       | [Upstash](https://upstash.com) | Free |
| Backend API | [Render](https://render.com) | Free   |
| Frontend    | [Vercel](https://vercel.com) | Free   |

You will end up with one URL for your frontend (Vercel) and one for your
backend (Render), and the two will talk over HTTPS + WSS in production.

> **Architecture in one line:** browser (Vercel) → REST + Socket.IO (Render) → Postgres (Neon) + Redis (Upstash).

---

## 0. Before you start

Make sure you have:

- A GitHub account
- The project working locally (Home + Admin pages, live updates).
- The production-ready tweaks already applied in this repo:
  - `backend/src/app.js` accepts a **comma-separated** `CORS_ORIGIN` so you can allow both `http://localhost:3000` and your Vercel URL.
  - `backend/src/sockets/index.js` does the same for Socket.IO.
  - `backend/package.json` has `"postinstall": "prisma generate"` and `"build": "prisma generate && prisma migrate deploy"` — Render needs these to generate the Prisma client and apply migrations.
  - `frontend/src/lib/socket.js` uses `transports: ['polling','websocket']` so it works behind proxies that block raw WS.

If any of those are missing in your fork, copy them from this repo.

---

## 1. Push the code to GitHub

From the project root (`syncup-coaching-feed/`):

```bash
git init
git branch -M main
git add .
git commit -m "Initial commit: SYNCUP realtime coaching feed"

# Create an empty repo on github.com first, then:
git remote add origin https://github.com/<your-username>/syncup-coaching-feed.git
git push -u origin main
```

> ⚠️ **Never commit `.env` files.** The `.gitignore` files in `backend/` and `frontend/` already exclude them. Only `.env.example` / `.env.local.example` are committed.

Sanity check: open the repo on GitHub. You should see `backend/`, `frontend/`, `README.md`, `DEPLOYMENT.md` — and **no `.env`**.

---

## 2. PostgreSQL on Neon

Neon gives you a serverless Postgres with a connection string you can paste into Prisma.

1. Go to <https://neon.tech> → sign in with GitHub.
2. **Create project**:
   - Name: `syncup`
   - Region: pick the one nearest your Render region (e.g. `us-east-1`).
   - Postgres version: latest is fine.
3. After it's created, click **Dashboard → Connection Details**.
4. Copy the **pooled** connection string. It looks like:
   ```
   postgresql://neondb_owner:<password>@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
5. **Save this** — it's your `DATABASE_URL`.

### About `sslmode=require`
Neon requires SSL. Prisma honors `sslmode=require` from the URL — no extra config.

### Apply migrations to Neon

Easiest path: run from your laptop **once** before deploying, so the schema exists when Render boots:

```bash
cd backend
# Point local Prisma at Neon for one command, without touching .env
DATABASE_URL="postgresql://...?sslmode=require" npx prisma migrate deploy
```

You should see:
```
Applying migration `20260519044016_init`
All migrations have been successfully applied.
```

Verify in the Neon SQL editor:
```sql
SELECT * FROM "Feed";   -- should return an empty table, not an error
```

> Render's build will also run `prisma migrate deploy` (via `npm run build`), so it's idempotent — running it twice is safe.

---

## 3. Redis on Upstash

1. Go to <https://upstash.com> → sign in with GitHub.
2. **Create Database** → Redis.
   - Name: `syncup-cache`
   - Region: nearest to your Render region.
   - Type: **Regional** (free tier) — Global is not needed.
   - TLS: **Enabled** (default).
3. Open the database. In the **REST/Redis** section, copy the **`UPSTASH_REDIS_URL`** that starts with `rediss://` (note the **two s's** — that's TLS):
   ```
   rediss://default:<password>@<region>.upstash.io:6379
   ```
4. **Save this** — it's your `REDIS_URL`.

> `ioredis` understands `rediss://` out of the box — TLS is auto-enabled. No code change needed.

Sanity test from your laptop:
```bash
npm i -g redis-cli   # or use redis-cli if already installed
redis-cli -u "rediss://default:<password>@<region>.upstash.io:6379" ping
# → PONG
```

---

## 4. Backend on Render

Render gives you a public HTTPS URL with auto-deploy from GitHub. WebSocket connections are supported on the free Web Service plan (the free tier sleeps after 15 min of no traffic — fine for an assessment demo).

1. Go to <https://render.com> → sign in with GitHub.
2. **New → Web Service**.
3. Connect your `syncup-coaching-feed` repo.
4. Configure:

   | Field                  | Value                                        |
   | ---------------------- | -------------------------------------------- |
   | Name                   | `syncup-backend`                             |
   | Region                 | Same as Neon / Upstash                       |
   | Branch                 | `main`                                       |
   | **Root Directory**     | `backend`                                    |
   | **Runtime**            | Node                                         |
   | **Build Command**      | `npm install && npm run build`               |
   | **Start Command**      | `npm start`                                  |
   | Plan                   | Free                                         |

   - `npm install` triggers the `postinstall` script → `prisma generate`.
   - `npm run build` runs `prisma generate && prisma migrate deploy` against your Neon DB.
   - `npm start` runs `node src/server.js`.

5. **Environment variables** (Render → Service → Environment):

   | Key                | Value                                                                  |
   | ------------------ | ---------------------------------------------------------------------- |
   | `NODE_VERSION`     | `20`                                                                   |
   | `DATABASE_URL`     | *(your Neon pooled URL with `?sslmode=require`)*                       |
   | `REDIS_URL`        | *(your Upstash `rediss://…` URL)*                                       |
   | `CORS_ORIGIN`      | `http://localhost:3000,https://<your-app>.vercel.app` *(fill after step 5)* |
   | `FEED_CACHE_KEY`   | `feed:list`                                                            |
   | `FEED_CACHE_TTL`   | `60`                                                                   |

   > Render injects its own `PORT` env var (don't hardcode 4000). Our `server.js` already reads `process.env.PORT`.

6. Click **Create Web Service**. Watch the **Logs** tab.

   Expected log lines (in order):
   ```
   ==> Running 'npm install && npm run build'
   ✔ Generated Prisma Client
   Applying migration ...
   ==> Running 'npm start'
   [INFO] Redis connected
   [INFO] API listening on http://localhost:10000   ← Render's internal port
   ==> Your service is live 🎉
   ```

7. Copy the **public URL** — looks like `https://syncup-backend.onrender.com`.
   This is what your frontend will call.

### Smoke test the deployed backend

```bash
curl https://syncup-backend.onrender.com/health
# → {"ok":true}

curl https://syncup-backend.onrender.com/api/feed
# → {"data":[]}

curl -X POST https://syncup-backend.onrender.com/api/feed \
  -H 'content-type: application/json' \
  -d '{"title":"Live","content":"From the cloud"}'
# → {"data":{...}}
```

---

## 5. Frontend on Vercel

1. Go to <https://vercel.com> → sign in with GitHub.
2. **Add New → Project** → import your `syncup-coaching-feed` repo.
3. Configure:

   | Field                | Value          |
   | -------------------- | -------------- |
   | Framework Preset     | Next.js (auto) |
   | **Root Directory**   | `frontend`     |
   | Build Command        | `npm run build` (default) |
   | Output Directory     | `.next` (default)         |
   | Install Command      | `npm install` (default)   |

4. **Environment variables** (the `NEXT_PUBLIC_` prefix is required so they reach the browser):

   | Key                       | Value                                  |
   | ------------------------- | -------------------------------------- |
   | `NEXT_PUBLIC_API_URL`     | `https://syncup-backend.onrender.com/api` |
   | `NEXT_PUBLIC_SOCKET_URL`  | `https://syncup-backend.onrender.com`     |

5. Click **Deploy**. After ~1 minute you'll get a URL like `https://syncup-coaching-feed.vercel.app`.

6. **Now update CORS on Render**: go back to Render → Environment → set
   ```
   CORS_ORIGIN=http://localhost:3000,https://syncup-coaching-feed.vercel.app
   ```
   Save → Render auto-redeploys. Until you do this, the browser will see CORS errors.

---

## 6. End-to-end test in production

Open in two browser windows (or two devices):

- **Window A:** `https://syncup-coaching-feed.vercel.app/`
- **Window B:** `https://syncup-coaching-feed.vercel.app/admin`

In window B, submit a post. Window A should show the new card **instantly** with no refresh.

DevTools checks (Window A):

- **Console:** one `[socket] connected <id>` line, one `feed:new` event per post (not two — dedupe working).
- **Network → WS tab:** an open WebSocket to `wss://syncup-backend.onrender.com/socket.io/...`.
- **Network → XHR:** the initial `GET /api/feed` should be 200.

### Verify Redis cache is working

In Upstash → your DB → **Data Browser** (or use `redis-cli -u rediss://…`):

1. Right after a `GET /feed` you should see `feed:list` exists.
   ```
   GET feed:list   → "[{...}]"
   TTL feed:list   → 60 (or less)
   ```
2. Right after a `POST /feed` it disappears (invalidated).
3. The next `GET /feed` refills it.

You can also `tail` Render logs and look for the line `Cache HIT feed:list` vs `Cache MISS feed:list`.

### Verify Postgres connection

In Neon → SQL Editor:
```sql
SELECT id, title, "createdAt" FROM "Feed" ORDER BY "createdAt" DESC LIMIT 5;
```
Every post you submit through the Admin page should show up here within ~1 second.

---

## 7. Common issues & fixes

### A. CORS errors in browser console
```
Access to XMLHttpRequest at 'https://syncup-backend.onrender.com/api/feed'
from origin 'https://syncup-coaching-feed.vercel.app' has been blocked by CORS
```
**Fix:** make sure your **Render** `CORS_ORIGIN` env var contains the exact Vercel URL (no trailing slash). After editing, click **Manual Deploy** to apply.

Multiple origins are comma-separated:
```
CORS_ORIGIN=http://localhost:3000,https://syncup-coaching-feed.vercel.app
```

### B. Socket.IO not connecting in production
Symptoms: page works but new posts don't appear live; console shows repeated `[socket] disconnected` lines or `WebSocket connection ... failed`.

**Fix checklist:**
1. `NEXT_PUBLIC_SOCKET_URL` must be the **https** URL of Render (the client upgrades `https://` → `wss://` automatically).
2. Confirm `CORS_ORIGIN` on Render includes the Vercel URL (Socket.IO has its own CORS check).
3. Our `transports: ['polling', 'websocket']` lets the client start with polling and upgrade — keep that, don't force `['websocket']` only.
4. Re-deploy Vercel after changing env vars (env vars are baked at build time for `NEXT_PUBLIC_*`).

### C. Prisma errors on Render
```
Error: P1001 Can't reach database server at ep-xxx.aws.neon.tech:5432
```
**Fix:** check `DATABASE_URL` ends with `?sslmode=require` and uses the **pooled** Neon endpoint.

```
@prisma/client did not initialize yet. Please run "prisma generate"
```
**Fix:** ensure `"postinstall": "prisma generate"` is in `backend/package.json` (it is in this repo). On Render, **Manual Deploy → Clear build cache & deploy**.

### D. Migrations not applied
Symptom: `relation "Feed" does not exist` after deploy.

**Fix:** either
- Run `DATABASE_URL=... npx prisma migrate deploy` from your laptop, **or**
- Make sure the Render **Build Command** is `npm install && npm run build` (our `build` script runs `prisma migrate deploy`).

### E. Render free tier "spinning down"
Free Render services sleep after ~15 min of inactivity. The first request after sleep takes 30–60s. For an assessment demo this is OK — mention it. For real traffic, upgrade to a paid plan or use Render's *Cron Jobs* / external pinger to keep it warm.

### F. Vercel env vars not taking effect
`NEXT_PUBLIC_*` variables are inlined **at build time**, not runtime. After changing them in the Vercel dashboard you **must redeploy** (Deployments → ⋯ → Redeploy).

### G. Redis "MaxRetriesPerRequestError"
Usually means the URL is wrong or Upstash is on a different region with high latency. Increase the retry limit in `backend/src/config/redis.js` (`maxRetriesPerRequest: 10`) or pick an Upstash region closer to Render.

### H. Mixed-content errors
Browser blocks `http://` API calls from an `https://` page. Always use the `https://` Render URL in your Vercel env vars.

---

## 8. Redeploying after code changes

Both Render and Vercel auto-deploy on `git push`:

```bash
git add .
git commit -m "fix: tweak feed validation"
git push origin main
```

- **Render:** triggers a new build (runs `npm install && npm run build`).
- **Vercel:** triggers a new deployment.

If something is stuck:
- Render → service → **Manual Deploy → Clear build cache & deploy**.
- Vercel → deployment → **⋯ → Redeploy** → check "Use existing build cache" OFF if you suspect cache issues.

---

## 9. URL summary (fill in for your assessment submission)

| What             | URL                                                              |
| ---------------- | ---------------------------------------------------------------- |
| GitHub repo      | `https://github.com/<you>/syncup-coaching-feed`                   |
| Frontend (Home)  | `https://<you>.vercel.app/`                                       |
| Frontend (Admin) | `https://<you>.vercel.app/admin`                                  |
| Backend API      | `https://syncup-backend.onrender.com/api/feed`                    |
| Health check     | `https://syncup-backend.onrender.com/health`                      |

For the assessment form, paste:

```
GitHub Repository:    https://github.com/<you>/syncup-coaching-feed
Live Demo (Frontend): https://<you>.vercel.app/
Live API (Backend):   https://syncup-backend.onrender.com
```

Plus a one-line "how to test":
> Open the frontend in two tabs (`/` and `/admin`). Post from `/admin` — the
> card appears on `/` instantly with no refresh. Realtime is over Socket.IO,
> reads are cached in Redis (Upstash), data is persisted in PostgreSQL (Neon).

---

## 10. Architecture diagram for the README / submission

```
                  ┌──────────────────────────┐
                  │   Browser (Vercel CDN)   │
                  │  Next.js Home + Admin    │
                  └────────┬─────────────────┘
                           │ HTTPS + WSS
                           ▼
                  ┌──────────────────────────┐
                  │  Render Web Service      │
                  │  Express + Socket.IO     │
                  └───┬───────────────┬──────┘
                      │               │
              Prisma  │               │ ioredis
                      ▼               ▼
              ┌───────────────┐ ┌──────────────┐
              │ Neon Postgres │ │  Upstash     │
              │   (Feed)      │ │   Redis      │
              └───────────────┘ └──────────────┘
```
