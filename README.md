# E&I Brief

**E&I Brief** is an AI-powered energy intelligence platform built for energy and infrastructure counsel, lawyers, and consultants. It continuously monitors dozens of specialist news sources, enriches every article with AI-generated summaries and sector tags, and surfaces the most relevant stories to each user through a personalised ranked feed, a narrative morning digest, and a team newsletter builder.

---

## Table of Contents

1. [What It Does](#what-it-does)
2. [Core Features](#core-features)
3. [How It Works — Under the Hood](#how-it-works)
4. [Pages & Navigation](#pages--navigation)
5. [News Sources](#news-sources)
6. [Personalisation & Learning](#personalisation--learning)
7. [AI Features](#ai-features)
8. [Admin & System Management](#admin--system-management)
9. [Tech Stack](#tech-stack)
10. [Database Schema](#database-schema)
11. [API Reference](#api-reference)
12. [Configuration & Environment Variables](#configuration--environment-variables)
13. [Running Locally](#running-locally)
14. [Deployment](#deployment)

---

## What It Does

Energy news moves fast. E&I Brief was built to replace the daily ritual of manually scanning a dozen specialist websites and newsletters. It does this in three ways:

1. **Aggregates** — pulls articles every 6 hours from curated RSS feeds, the GDELT global news database (free, unlimited), and The Guardian API. Every article is AI-classified by energy sector and geography.

2. **Personalises** — each user trains their own feed by clicking "Relevant" or "Skip" on articles. The ranking engine scores every article based on the user's sector interests, preferred keywords, and the collective feedback of the whole team.

3. **Briefs** — generates two AI-written outputs on demand: *The Brief* (a narrative morning read, written like a Financial Times column, organised by sector) and a *Newsletter* (a styled HTML email that the team can curate manually and send to clients or partners).

---

## Core Features

### My Feed (Personalised Ranked Feed)
- Every user sees a feed of articles ranked specifically for them, not a generic chronological list.
- The top article is displayed as a full hero card (large headline, pull-quote summary, source).
- The next two articles appear as a secondary row.
- Remaining articles are grouped into horizontally-scrollable sector rails.
- Clicking **Relevant** or **Skip** on any article trains the feed in real time. A brief "✓ Noted" flash confirms the signal was recorded.
- A keyboard-first interface: `J`/`K` to navigate, `S` to save, `R`/`X` for relevant/skip, `/` to search, `?` for help.

### All News Archive
- A searchable, paginated index of every article ever ingested — regardless of the user's preferences.
- Filter by sector (12 sectors supported) and geography.
- Full-text search across headlines and summaries.
- 40 articles per page with prev/next pagination.

### The Brief (AI Morning Digest)
- An AI-generated morning briefing personalised to the user's preferred sectors.
- Each section is written as two short paragraphs of flowing narrative prose (not a bullet list) — synthesising the day's stories and surfacing what connects them and why it matters.
- Opens with an AI-written editor's note naming where the most significant activity is.
- Each section includes a "On the wire" reference list with links to the individual articles.
- Cached for 6 hours; force-refresh available any time.
- Printable via a dedicated Print button.

### Saved Articles (Reading List)
- Bookmark any article from any page with the Save button.
- Saved articles appear in a dedicated reading list.
- Three tabs: **All**, **Unread**, **Read** — read/unread status is tracked in the browser (no backend required).

### Newsletter Builder
- The whole team uses a shared newsletter tool to curate and send weekly or ad hoc briefings.
- Articles are picked manually from the full article pool (not personalised — everyone on the team sees the same list). Each article shows its headline, a 2-line summary, sector, source, and geography to make selection quick.
- Selected articles are organised into sections (e.g. "Nuclear & Infrastructure", "Oil & Gas") defined in the newsletter configuration.
- Claude writes editorial section summaries and formats everything into a polished HTML email with a branded masthead, white background (safe for all email clients), amber section rules, and clean typography.
- The generated newsletter can be previewed in-browser and downloaded as an HTML file.
- All generated newsletters are automatically archived for future reference.

### Preferences
- Each user configures which sectors and geographies they care about.
- Include/exclude keywords boost or suppress specific topics.
- Match strictness controls how aggressively the feed filters to preferences (loose = see more, strict = see only exact matches).
- Custom RSS sources can be added, and any source can be enabled or disabled.
- Source quality scores (calculated from team feedback) are visible — so you can see which sources the team trusts.

---

## How It Works

### Article Ingestion Pipeline

Every 6 hours, three fetchers run in parallel:

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   RSS Fetcher        │     │   GDELT Fetcher       │     │  Guardian Fetcher   │
│  28 curated sources  │     │  Free, no API key     │     │  Free tier, 5k/day  │
│  Sector pre-labelled │     │  12 sector queries    │     │  12 sector queries  │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
           │                          │                          │
           └──────────────────────────┴──────────────────────────┘
                                      │
                            ┌─────────▼─────────┐
                            │    Deduplication   │
                            │  ON CONFLICT (url) │
                            │    DO NOTHING      │
                            └─────────┬──────────┘
                                      │
                            ┌─────────▼─────────┐
                            │  AI Enrichment     │
                            │  Claude API        │
                            │  • Sector classify │
                            │  • Geography tag   │
                            │  • 2-line summary  │
                            └────────────────────┘
```

- **RSS** articles come pre-tagged with a sector (based on which RSS feed they came from).
- **GDELT** and **Guardian** articles arrive untagged — Claude classifies their sector and geography in a batch enrichment step.
- Deduplication is by URL — the same article from two sources is only stored once.

### Article Ranking Formula

When a user loads My Feed, every candidate article receives a score:

```
score =  epoch_hours                          ← recency (older = lower)
       + global_votes × 10                   ← crowd signal (team's collective feedback)
       + (source_quality − 0.5) × 20         ← source trust (updated after each click)
       + sector_affinity × 15                ← how often the user liked this sector
       + keyword_match × 5                   ← matches keywords from user's liked articles
```

- `sector_affinity` is calculated from the user's feedback history: if they've clicked Relevant on nuclear articles 80% of the time, nuclear scores get a strong boost.
- `keyword_match` extracts the top 15 keywords from the user's last 50 "relevant" articles and boosts articles whose headlines/summaries contain them.
- `source_quality = relevant_count / total_feedback` per RSS source, updated in real time.

### Preference Learning

Every time a user clicks Relevant or Skip:

1. The feedback is saved to `user_feedback` (per user, per article).
2. The article's RSS source gets its quality score recalculated.
3. The next feed load uses the updated affinity scores and keyword pattern.

Over time the feed becomes increasingly accurate at surfacing what each user actually reads and cares about.

---

## Pages & Navigation

| Page | URL | Access |
|------|-----|--------|
| My Feed | `/` | All users |
| All News | `/all` | All users |
| The Brief | `/digest` | All users |
| Saved | `/saved` | All users |
| Newsletter | `/newsletter` | All users |
| Preferences | `/preferences` | All users |
| System | `/system` | All users (admin features gated) |
| Login | `/login` | Public |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `J` / `K` | Navigate next/previous article in feed |
| `S` | Save/unsave focused article |
| `R` | Mark focused article as Relevant |
| `X` | Skip focused article |
| `/` | Focus the search bar |
| `⌘K` | Open command palette |
| `?` | Open keyboard shortcuts help |

---

## News Sources

### Built-in RSS Feeds (28 sources)

| Sector | Sources |
|--------|---------|
| Nuclear | World Nuclear News, Nuclear Engineering International |
| Oil & Gas | Oil & Gas Journal, Rigzone, Natural Gas World, LNG Prime |
| Wind | Offshore Wind Biz, Windpower Monthly, Recharge News |
| Solar | PV Tech, Solar Power World |
| Hydrogen | Hydrogen Insight, Hydrogen Fuel News |
| Mining | The Northern Miner, Mining Journal, Kitco News |
| CCUS / Carbon | Carbon Brief, Carbon Pulse |
| Storage (BESS) | Energy Storage News |
| Data Centres | Data Center Frontier, The Register |
| Grid & Infrastructure | Utility Week, New Civil Engineer |
| General Energy | Politico Energy, Energy Monitor, Canary Media, Lexology Energy, Reuters Energy |

### GDELT DOC 2.0 (free, unlimited)
Scans the global news index using 12 energy keyword queries (one per sector) for English-language articles published in the last 48 hours. Up to 250 results per sector per run. No API key required. Source attribution is the article's domain (e.g., `reuters.com`).

### The Guardian Open Platform (free, 5,000 req/day)
Queries The Guardian's content API across 12 sector search terms. Returns full trail text as article summary. Requires a free API key from [open-platform.theguardian.com](https://open-platform.theguardian.com/access/). Skips gracefully if the key is not configured.

### Adding Custom Sources
Any RSS feed can be added through the Preferences page → RSS Sources section. Custom sources go through the same AI enrichment pipeline and are ranked alongside built-in sources.

---

## Personalisation & Learning

### Sectors
13 sectors are supported: Nuclear, Oil & Gas, Wind, Solar, Hydrogen, Mining, CCUS, Carbon Markets, Storage (BESS), Data Centres, Grid Infrastructure, PPAs, General.

### Geographies
Articles are tagged to one of: UK, EU, US, Middle East, Asia Pacific, Africa, Americas, Global.

### User Preferences
Each user can configure:
- **Sectors included** — which sectors appear in My Feed (empty = all)
- **Geographies included** — which geographies appear in My Feed (empty = all)
- **Keywords to include** — words that boost matching articles
- **Keywords to exclude** — words that suppress matching articles
- **Match strictness** — how tightly filters are applied

### Source Quality Scores
Every RSS source has a quality score (0–1) calculated from the team's collective feedback. Sources whose articles are regularly marked relevant by users get higher scores, which means their future articles rank higher for everyone. GDELT and Guardian articles get classified by this score once they have enough feedback.

---

## AI Features

All AI features use Claude (Anthropic) via the `claude-sonnet-4-20250514` model.

| Feature | What Claude does |
|---------|-----------------|
| **Article enrichment** | Classifies sector (one of 13), detects geography (one of 8 regions), writes a 2-sentence professional summary. Runs in batches of 10. |
| **The Brief — section narrative** | For each sector, writes two short paragraphs in a financial journalist's voice: synthesises the stories, names the players, surfaces the connections. ~120 words per section. |
| **The Brief — editor's intro** | One short paragraph naming the most active sectors and setting the tone for the whole brief. |
| **Newsletter sections** | For each practice area group, writes a 2-3 sentence editorial overview followed by bulleted article takeaways with source attribution. |
| **Newsletter title** | Generates a headline for the newsletter if none is provided. |

If `ANTHROPIC_API_KEY` is not set, enrichment is skipped and the newsletter generator falls back to a plain list format. The Brief still loads but without narrative summaries.

---

## Admin & System Management

The System page (`/system`) provides:

- **Health dashboard** — database connection status, AI availability, Claude model/provider.
- **Article statistics** — total articles, articles in last 24 hours, articles in last 7 days, number of distinct sectors represented.
- **Source statistics** — total sources, number currently enabled.
- **Last run info** — when the last fetch ran, how long it took, how many articles were added, any errors.
- **Manual fetch trigger** — runs all three fetchers (RSS + GDELT + Guardian) plus enrichment immediately, without waiting for the cron schedule.

**Admin-only features** (requires `is_admin = true`):
- User list with creation date and last active time.
- Create new users (name, display name, password, admin flag).
- Reset any user's password.
- Delete users.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| Next.js 16 (App Router) | React framework, file-based routing, Server/Client components |
| React 19 | UI library |
| TypeScript | Type safety across all components and API calls |
| Tailwind CSS v4 | Utility-first styling with OKLCH colour palette |
| shadcn/ui | Accessible UI primitives (Button, Card, Badge, Input, etc.) |
| cmdk | Command palette (⌘K) |
| next-themes | Light/dark mode toggle with persistence |
| Fraunces (Google Font) | Editorial serif for headlines |
| Geist Sans | UI sans-serif |

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js (ESM) | Server runtime |
| Express | HTTP framework |
| PostgreSQL | Primary database |
| `pg` | PostgreSQL client |
| `rss-parser` | RSS/Atom feed parsing |
| `node-cron` | Scheduled fetch cycles |
| `bcrypt` | Password hashing |
| `jsonwebtoken` | JWT auth tokens (90-day expiry) |
| `@anthropic-ai/sdk` | Claude API client |

### Infrastructure
| Service | Role |
|---------|------|
| Railway | Backend hosting + managed PostgreSQL |
| Vercel | Frontend hosting (auto-deploys from `main`) |
| GitHub | Source control, PR-based deployment workflow |

---

## Database Schema

### Tables

**`users`** — Team members
```
id, name (unique), display_name, password_hash, is_admin, sector_focus, last_active, created_at
```

**`user_preferences`** — Per-user settings
```
user_id, key, value (JSONB), updated_at
```
Keys: `sectors_included`, `geographies_included`, `keywords_include`, `keywords_exclude`, `match_strictness`

**`rss_sources`** — Configured news sources
```
id, name, rss_url (unique), sector, enabled, quality_score, total_feedback, relevant_count, created_at
```

**`articles`** — All ingested articles
```
id, headline, url (unique), summary, source_name, source_key, sector, geography, published_at, fetched_at, content_hash
```

**`user_feedback`** — Relevant/Skip signals
```
id, user_id, article_id, feedback ('relevant' | 'not_relevant'), created_at
UNIQUE (user_id, article_id)
```

**`user_saved_articles`** — Bookmarks
```
user_id, article_id, saved_at
PRIMARY KEY (user_id, article_id)
```

**`newsletter_config`** — Newsletter section definitions
```
id, practice_area, sector_keys (TEXT[]), display_order, active
```

**`newsletter_archive`** — Past newsletters
```
id, title, html_content, generated_at, article_ids (UUID[])
```

**`user_digests`** — Cached The Brief output
```
user_id (PRIMARY KEY), generated_at, digest_json (JSONB)
```
Cache TTL: 6 hours.

---

## API Reference

All API routes require the `x-api-key` header (set to the value of `API_KEY` in `.env`). Authenticated routes also require a `Authorization: Bearer <token>` header obtained from `/auth/login`.

### Authentication
```
POST   /auth/login              { username, password } → { token, user }
GET    /auth/users              List all users [admin]
POST   /auth/users              Create user [admin]
PUT    /auth/users/:id          Update user [admin]
PUT    /auth/users/:id/password Reset password [admin]
DELETE /auth/users/:id          Delete user [admin]
```

### Feed
```
GET  /feed                      Personalised ranked feed (respects user prefs)
GET  /feed/all                  All articles — searchable/paginated
                                  ?sector=nuclear&geography=UK&search=KEYWORD&limit=40&offset=0
POST /feed/feedback             { article_id, feedback, excluded_ids[] }
POST /feed/save/:id             Toggle save (returns { is_saved: boolean })
```

### Content
```
GET  /digest                    The Brief (cached 6h)
GET  /digest?force=1            Force regenerate The Brief
GET  /articles/saved            User's saved articles
```

### Newsletter
```
POST /newsletter/generate       { article_ids[], title? } → { newsletter: { title, html } }
GET  /newsletter/archive        List past newsletters
GET  /newsletter/archive/:id    Get archived newsletter HTML
```

### Preferences
```
GET    /preferences             User preferences + newsletter config
PUT    /preferences/:key        Update a preference key
PUT    /preferences/newsletter/:id   Update newsletter section
POST   /preferences/newsletter       Add newsletter section
DELETE /preferences/newsletter/:id   Remove newsletter section
```

### Sources
```
GET    /sources                 All RSS sources
POST   /sources                 Add source { name, rss_url, sector }
PUT    /sources/:id             Update source
DELETE /sources/:id             Remove source
```

### System
```
GET  /system/status             Health + stats
POST /system/run                Trigger manual fetch cycle
GET  /system/users              User list [admin]
```

---

## Configuration & Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `API_KEY` | ✅ | Shared API key sent by the frontend in `x-api-key` |
| `ANTHROPIC_API_KEY` | ✅ | Claude API key for enrichment and AI generation |
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens |
| `PORT` | — | Server port (default: 3001) |
| `NODE_ENV` | — | `development` or `production` |
| `ALLOWED_ORIGINS` | — | Comma-separated CORS origins for production |
| `TEAM_PASSWORD` | — | Optional shared gate password |
| `CRON_SCHEDULE` | — | Override the 6-hour fetch schedule (cron syntax) |
| `GUARDIAN_API_KEY` | — | The Guardian Open Platform key (free; fetcher skips if absent) |
| `SEED_ADMIN_NAME` | — | Admin username to seed on first run |
| `SEED_ADMIN_PASSWORD` | — | Admin password to seed on first run |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API base URL (e.g. `https://your-backend.railway.app`) |
| `NEXT_PUBLIC_API_KEY` | ✅ | Must match `API_KEY` in backend |

---

## Running Locally

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- An Anthropic API key

### 1. Clone and install

```bash
git clone https://github.com/eaadal99/ei-brief.git
cd ei-brief

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — fill in DATABASE_URL, ANTHROPIC_API_KEY, API_KEY, JWT_SECRET

# Frontend
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local — set NEXT_PUBLIC_API_URL=http://localhost:3001
#                              set NEXT_PUBLIC_API_KEY= (same as API_KEY in backend)
```

### 3. Set up the database

```bash
cd backend
npm run migrate
```

This runs all migrations in `backend/db/migrations/` and seeds initial RSS sources.

### 4. Start the services

```bash
# Backend (in one terminal)
cd backend && npm run dev

# Frontend (in another terminal)
cd frontend && npm run dev
```

Backend runs on `http://localhost:3001`. Frontend runs on `http://localhost:3000`.

### 5. First login

On first run, set `SEED_ADMIN_NAME` and `SEED_ADMIN_PASSWORD` in `backend/.env` before running `npm run migrate`. These credentials create the initial admin account. Log in at `http://localhost:3000/login`.

---

## Deployment

The production deployment uses:
- **Vercel** for the Next.js frontend — auto-deploys from the `main` branch on GitHub.
- **Railway** for the Express backend and managed PostgreSQL database.

### Workflow

All changes are made on feature branches and merged to `main` via pull requests:

```bash
git checkout -b feat/my-feature
# make changes
git push origin feat/my-feature
gh pr create --base main
gh pr merge --squash --admin
```

Vercel picks up the merge to `main` and deploys within ~2 minutes. Railway deploys the backend on push to `main` as well.

### Adding the Guardian API key (recommended)

1. Register for a free key at [open-platform.theguardian.com/access](https://open-platform.theguardian.com/access/).
2. Add `GUARDIAN_API_KEY=your_key_here` to Railway environment variables.
3. The Guardian fetcher will activate on the next scheduled run (or trigger manually from the System page).

---

## Intended Direction

E&I Brief is designed to grow with the team. Features that are architecturally supported and can be added:

- **Multi-team / multi-client** — The preference system is fully per-user. Newsletter sections can be customised per practice area.
- **Scheduled newsletters** — The newsletter generator already archives output; adding a scheduled send (via email provider like Resend or SendGrid) is straightforward.
- **More news sources** — Any RSS feed or JSON API can be integrated. The enrichment pipeline classifies and summarises new sources automatically.
- **Saved search alerts** — The keyword system already exists; saved keyword sets with notification on new matches is a natural extension.
- **Mobile app** — The API is fully REST-based. The frontend is responsive and designed mobile-first.

---

*Built for energy counsel who need to know what moved today — before the markets open.*
