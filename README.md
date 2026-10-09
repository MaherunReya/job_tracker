# Job Tracker

Track job and internship applications on a Kanban board.

**Stack:** React (Vite) · Node.js/Express · PostgreSQL · JWT auth · Docker · GitHub Actions

**Live demo:** _add URL after deploying_

## Features
- Register / log in (JWT, bcrypt)
- Create, update, delete applications
- Kanban board: Wishlist → Applied → Interview → Offer → Rejected
- Search by company or role
- Security basics: helmet headers, rate-limited auth, parameterized SQL, per-user data isolation
- API tests run in CI against a real PostgreSQL

## Run locally (Windows / PowerShell)

Requires Node 20+ and Docker Desktop.

```powershell
# 1. Start PostgreSQL (also creates the tracker_test database on first run)
docker compose up db -d

# 2. API (creates tables automatically on startup)
cd server
copy .env.example .env
npm install
npm run dev

# 3. Client (new terminal)
cd client
npm install
npm run dev
```

Open http://localhost:5173

### Or run everything in Docker
```powershell
docker compose up --build
```
Open http://localhost:8080 (nginx serves the client and proxies `/api` to the server).

## Tests
```powershell
cd server
copy .env.test.example .env.test
npm test
```
Tests wipe their database, so they **refuse to run unless the database name contains `test`**
(`tracker_test`). If your Postgres volume already existed before this repo added the test database, create it once:
`docker compose exec db createdb -U tracker tracker_test`

## Environment variables

| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL` | server | Required. Server exits at startup if missing. |
| `JWT_SECRET` | server | Required. In production: 32+ chars, not a placeholder. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_URL` | server | Allowed CORS origin(s), comma-separated. |
| `NODE_ENV` | server | Set to `production` when deployed (the Dockerfile does this). |
| `DATABASE_SSL` | server | `true` only if your host needs SSL and the URL lacks `?sslmode=require`. |
| `TRUST_PROXY` | server | Proxies in front of the API. Defaults to `1` in production. |
| `AUTH_RATE_LIMIT_MAX` / `API_RATE_LIMIT_MAX` | server | Defaults: 20 per 15 min on login/register, 600 per 15 min on the API. |
| `VITE_API_URL` | client (build time) | Full API URL when API and client are on different domains. Leave empty otherwise. |

## Deploy (free tier: Neon + Render + Vercel)

1. **Database - Neon:** create a project, copy the connection string.
2. **API - Render:** New Web Service from this repo, root directory `server`, runtime Docker. Set env vars:
   `DATABASE_URL` (Neon string), `JWT_SECRET` (generated, 32+ chars), `CLIENT_URL` (your Vercel URL, set after step 3).
   Tables are created automatically on every start. Health check path: `/api/health`.
3. **Client - Vercel:** import the repo, root directory `client`, framework Vite. Set `VITE_API_URL` to your Render URL
   (no trailing slash). Redeploy after changing it, since Vite bakes it in at build time.
4. Go back to Render and set `CLIENT_URL` to the Vercel URL. Redeploy the API.
5. Put the live URL at the top of this README.

Note: Render's free tier sleeps after inactivity, so the first request can take ~30-60 seconds.

## API
| Method | Route | Description |
|---|---|---|
| GET | /api/health | Health check (verifies DB connection) |
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Log in |
| GET | /api/auth/me | Current user |
| GET | /api/applications?status=&q= | List / filter |
| POST | /api/applications | Create |
| PATCH | /api/applications/:id | Update |
| DELETE | /api/applications/:id | Delete |

## Design decisions / trade-offs
- **Raw SQL with `pg`** instead of an ORM: small schema, full control, easy to read.
- **JWT in `localStorage`:** simple, but readable by any XSS. Production hardening would be httpOnly cookies + CSRF protection.
- **Schema as idempotent SQL** run on startup (advisory-locked so two instances can't race). A migration tool (node-pg-migrate, Drizzle) is the next step once the schema starts changing.

## Roadmap
- [ ] Deploy (Neon + Render + Vercel)
- [ ] Edit modal for url / notes / applied date
- [ ] Drag-and-drop between columns
- [ ] Follow-up reminders
- [ ] Screenshots in this README
