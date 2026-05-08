# 🏆 2026 FIFA World Cup Betting App

> [!NOTE]
> This repo is also a Next.js learning playground. Co-created with Claude and Cursor.

A simple web app for running a private betting competition during the 2026 FIFA World Cup.

Players predict match scores and earn points based on how accurate their predictions are. Built for fun competition between friends.

## 🧰 Tech Stack

This project uses a modern full-stack setup built on Next.js and React, with a focus on performance, type safety, and server-first architecture.

### ⚙️ Core Framework

- **Next.js 16**
- **React 19.2**
- **TypeScript**

### 🎨 Styling

- **shadcn/ui** - reusable UI components
- **Tailwind CSS 4** - utility-first styling (via PostCSS integration)

### 🌍 Language

- **i18n-iso-countries** - ISO country codes

### 🔐 Authentication & Security

- **bcrypt.js** - password hashing
- **NextAuth.js** - authentication for Next.js

### 🗄️ Database

- **Drizzle ORM** - SQL ORM + schema management
- **Neon** - serverless Postgres driver

### 📦 File Uploads & Storage

- **Vercel Blob** - blob storage

### 🤖 External Services

- **Google Cloud Vision API** - OCR (Optical Character Recognition)

### 🧩 Runtime / Dev Utilities

- **dotenv** - environment variable loading
- **ESLint** - linting and code quality rules
- **tsx** - TypeScript execution in development

### 🧪 Testing (TBD)

- **React Testing Library**
- **Jest/Vitest**

## ✨ Features

### 🏠 Publicly available Home Page

- Leaderboard view
- Table of player predictions

### 🛠️ Admin Panel

- Admin login access
- Admin dashboard with summaries and key stats
- Match management (create matches, update final results)
- Participant management
- Prediction uploads:
  - upload images to **Vercel Blob**
  - run OCR via **Google Cloud Vision**
  - review and save parsed predictions to the database
- Manual editing of predictions (for fixing OCR mistakes)

## 🚧 Coming Soon

### 🏠 Home Page Improvements

- Show when the next match starts
- Add a link to uploaded predictions
- Add a link to download the template for betting the next round
- Sharing option: generate a screenshot of the table
- Add mobile-friendly layout

### 🛠️ Admin Panel Improvements

- Improve match management UI
- Improve participant management UI
- Add prediction editing UI
- Add mobile-friendly layout
- Show what match is next and when the next tournament stage begins
- Show how many predictions are missing
- Generate downloadable spreadsheet

### 🤖 OCR Improvements

- Improve OCR accuracy (correctly detect all test matches and scores)
- Detect participant from OCR text:
  - select an existing participant
  - or create a new one if not found
- Add an option to assign a tournament stage
- Rename uploaded files (include participant + stage)
- Group files inside Blob Storage (per tournament and stage)
- Link uploaded images to participants (so they can be shown on the home page)

### 🧱 Other

- Add a Match API to get live scores and live updates

## 🔴 Live score sync foundation

The project now includes a provider-agnostic live score sync service with two endpoints:

- `GET /api/matches/live` → returns normalized provider payload (preview mode)
- `GET /api/matches/live?mode=sync` → runs a sync (admin-authenticated)
- `POST /api/cron/sync-matches` → cron-safe sync endpoint (secret required)

### Environment variables

- `LIVE_MATCHES_PROVIDER_NAME` (default: `mock`)
- `LIVE_MATCHES_API_URL` (provider endpoint URL)
- `LIVE_MATCHES_API_KEY` (optional bearer token)
- `LIVE_MATCHES_ID_MAP` (JSON map of external match id -> local match number, e.g. `{"ext-123": 1}`)
- `LIVE_MATCHES_TIMEOUT_MS` (default: `10000`)
- `LIVE_SYNC_FREQUENCY_MINUTES` (display-only admin hint; default: `1`)
- `CRON_SYNC_SECRET` (required for cron endpoint auth)

### Sync behavior

- Incoming provider payload is normalized through adapter logic in `lib/live-matches.ts`.
- Mapping uses provider `matchNumber` first, then `LIVE_MATCHES_ID_MAP` by external id.
- Sync updates local `matches.status`, `matches.homeScore`, and `matches.awayScore`.
- Finished matches are never downgraded to non-finished statuses.
- If a finished result changes, prediction points are recalculated via existing scoring logic.

### Cron usage

Call `POST /api/cron/sync-matches` with one of:

- `Authorization: Bearer <CRON_SYNC_SECRET>`
- `x-cron-secret: <CRON_SYNC_SECRET>`

The endpoint is idempotent and returns counts for updated matches and recalculated predictions.

## 🧠 Diagrams

TBD

## 📸 Screenshots

TBD
