# SYNCUP — Realtime Coaching Feed

A small full-stack app that demonstrates a realtime feed of "coaching posts".
Admins create posts on `/admin`; everyone viewing `/` sees them appear live, with
no page refresh, backed by PostgreSQL for persistence and Redis for read-through
caching.

**Stack**

| Layer    | Tech                                |
| -------- | ----------------------------------- |
| Backend  | Node.js + Express                   |
| ORM      | Prisma                              |
| DB       | PostgreSQL                          |
| Cache    | Redis (ioredis)                     |
| Realtime | Socket.IO                           |
| Frontend | Next.js (App Router) + Tailwind     |
| HTTP     | Axios                               |

JavaScript only — no TypeScript.

---

## Project layout

```
syncup-coaching-feed/
├── backend/                 # Express + Prisma + Redis + Socket.IO
│   ├── prisma/schema.prisma
│   └── src/
│       ├── config/          # db + redis singletons
│       ├── services/        # feed.service.js  (DB + cache logic)
│       ├── controllers/     # feed.controller.js (HTTP layer)
│       ├── routes/          # feed.routes.js
│       ├── sockets/         # Socket.IO init
│       ├── middlewares/     # errorHandler, notFound
│       ├── utils/logger.js
│       ├── app.js           # Express app (no listen)
│       └── server.js        # http server + socket.io + listen
└── frontend/                # Next.js App Router
    └── src/
        ├── app/             # layout, page (Home), admin/page
        ├── components/      # FeedList, FeedItem, FeedForm, Loader, ErrorBanner
        ├── hooks/           # useSocket, useFeed
        └── lib/             # api.js (axios), socket.js (singleton)
```

---

## 1. Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+

### PostgreSQL setup (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql
sudo systemctl enable --now postgresql

# Create DB + user (adjust password to taste — keep it in sync with .env)
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE syncup;"
```

Sanity check:
```bash
psql "postgresql://postgres:postgres@localhost:5432/syncup" -c '\dt'
```

### Redis setup (Ubuntu/Debian)

```bash
sudo apt install redis-server
sudo systemctl enable --now redis-server
redis-cli ping     # → PONG
```

---

## 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init   # creates the Feed table
npm run dev                          # http://localhost:4000
```

`npm run dev` uses nodemon for hot reload. `npm start` runs the plain `node`.

Other handy scripts:

| Command                    | What it does                       |
| -------------------------- | ---------------------------------- |
| `npm run prisma:generate`  | Regenerate Prisma client           |
| `npm run prisma:studio`    | Browse the DB at localhost:5555    |

### REST API

| Method | Path           | Body                                | Returns                  |
| ------ | -------------- | ----------------------------------- | ------------------------ |
| GET    | `/health`      | —                                   | `{ ok: true }`           |
| GET    | `/api/feed`    | —                                   | `{ data: Feed[] }`       |
| POST   | `/api/feed`    | `{ title, content, author? }`       | `{ data: Feed }` (201)   |

Quick smoke test:
```bash
curl http://localhost:4000/api/feed
curl -X POST http://localhost:4000/api/feed \
  -H 'content-type: application/json' \
  -d '{"title":"Hello","content":"First post","author":"Coach K"}'
```

---

## 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                          # http://localhost:3000
```

Open:
- Home: <http://localhost:3000/>
- Admin: <http://localhost:3000/admin>

---

## 4. How realtime works

```
 ┌───────────┐   POST /api/feed   ┌───────────┐
 │  Admin    │ ─────────────────► │  Express  │
 │  page     │                    │ Controller│
 └───────────┘                    └─────┬─────┘
                                        │ 1) prisma.feed.create
                                        │ 2) redis.del('feed:list')
                                        │ 3) io.emit('feed:new', feed)
                                        ▼
                                   ┌─────────┐
                                   │Socket.IO│  broadcast to ALL clients
                                   └────┬────┘
                                        │ feed:new
                                        ▼
 ┌───────────┐                    ┌───────────┐
 │  Home     │ ◄────────────────  │  Browser  │ useFeed():
 │  page     │   update list      │  socket   │  setFeeds(prev =>
 └───────────┘                    └───────────┘   prev.some(f=>f.id===new.id)
                                                    ? prev
                                                    : [new, ...prev])
```

1. Admin submits the form → `POST /api/feed`.
2. Controller writes to Postgres → invalidates Redis (`DEL feed:list`) → emits `io.emit('feed:new', feed)`.
3. Every connected client receives `feed:new`. The `useFeed` hook prepends it to local state (de-duplicating by `id`).
4. A brand-new visitor hits Home → `GET /api/feed` → service checks Redis; miss → reads Postgres → repopulates Redis with TTL 60s.
5. If a client drops (sleep, wifi blip), `socket.io-client` reconnects automatically. On `reconnect` we re-fetch `/feed` so anything posted during the outage shows up.

### Why no duplicates?

Three layers of defence:

1. **Singleton socket** on the frontend (`lib/socket.js`) so React StrictMode and Next.js HMR don't open multiple connections.
2. **Cleanup on unmount** in `useFeed` (`socket.off(...)`) so handlers don't stack.
3. **`id`-based dedupe** inside the state updater so even if a duplicate event sneaks through, the UI ignores it.

---

## 5. How Redis caching works

We use the **cache-aside** pattern.

```
GET /api/feed
   │
   ▼
 redis.get('feed:list')
   │
   ├── HIT  → JSON.parse → return
   └── MISS → prisma.feed.findMany(...)
              → redis.set('feed:list', JSON, 'EX', 60)
              → return

POST /api/feed
   ├─ prisma.feed.create(...)
   ├─ redis.del('feed:list')      ← invalidation
   └─ io.emit('feed:new', feed)
```

- **Key:** `feed:list` (one key for the latest 50 posts).
- **TTL:** 60 seconds. Acts as a safety net if a `DEL` is ever lost.
- **Why invalidate instead of update-in-place?** Simpler, race-free, and easy to talk through in an interview. The next GET repopulates the cache from Postgres.

You can watch the cache live with:
```bash
redis-cli monitor
```

---

## 6. Scalability talking points

- **Stateless Express + Redis-adapter for Socket.IO** lets you scale horizontally; this assessment uses the default in-memory adapter (fine for a single node). For multi-node, add `@socket.io/redis-adapter`.
- **Pagination** is the next step beyond `take: 50` — cursor on `createdAt` works well.
- **Cache key strategy** would shift to `feed:list:page:<n>` with prefix-based invalidation.
- **Validation** would graduate from inline checks to `zod` schemas at the route layer.

---

## 7. Verification checklist

1. `redis-cli ping` → `PONG`
2. Postgres `Feed` table exists: `psql -d syncup -c '\dt'`
3. Backend up: `curl localhost:4000/health` → `{"ok":true}`
4. Open `/` in one tab, `/admin` in another, submit a post — it appears on `/` instantly.
5. `redis-cli` → `GET feed:list` is empty right after a POST and refills on the next GET.
6. Kill backend → Home shows error banner. Restart → list refreshes after reconnect.
7. `curl -X POST localhost:4000/api/feed -H 'content-type: application/json' -d '{}'` → 400 with a clear JSON error.

---

## 8. Troubleshooting

| Symptom                                              | Likely cause / fix                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------- |
| `ECONNREFUSED 127.0.0.1:5432`                        | Postgres not running. `sudo systemctl start postgresql`.                    |
| `ECONNREFUSED 127.0.0.1:6379`                        | Redis not running. `sudo systemctl start redis-server`.                     |
| `PrismaClientInitializationError`                    | `DATABASE_URL` wrong or migration not run. Re-run `npx prisma migrate dev`. |
| CORS errors in browser                               | Make sure `CORS_ORIGIN` in backend `.env` matches the Next dev URL.         |
| Socket connects but no `feed:new`                    | Confirm `app.set('io', io)` ran and the controller calls `req.app.get('io')`. |
| Posts appear twice on Home                           | Almost always a missing `socket.off(...)` in cleanup. Check `useFeed.js`.   |
