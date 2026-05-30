# OpenStock — Agent Guide

## Quick start
```sh
pnpm install              # or npm install
cp .env.example .env      # fill in secrets (see README.md)
pnpm dev                  # Next.js dev with Turbopack on :3000
pnpm test:db              # verify MongoDB connectivity first
npx inngest-cli@latest dev  # separate terminal: Inngest dev server (functions, cron)
pnpm test                 # Vitest (all tests)
pnpm test:watch           # Vitest watch
pnpm lint                 # ESLint (next/core-web-vitals + next/typescript)
pnpm build && pnpm start  # production
```

## Architecture

- **Next.js 15 App Router**, React 19, TypeScript strict, `@/` alias → project root.
- **Auth**: Better Auth (email/password) + MongoDB adapter. Singleton at `lib/better-auth/auth.ts` — `export const auth = await getAuth()` (top-level await).
- **Middleware**: `middleware/index.ts` — NOT root `middleware.ts`. Uses Better Auth `getSessionCookie`. Protects all routes except `sign-in`, `sign-up`, `forgot-password`, `reset-password`, `api`, `_next/*`, `assets/*`.
- **Server actions**: `'use server'` files in `lib/actions/` → `auth.actions.ts`, `finnhub.actions.ts`, `watchlist.actions.ts`, `user.actions.ts`, `alert.actions.ts`, `adanos.actions.ts`.
- **DB**: MongoDB + Mongoose. Custom DNS (`8.8.8.8`, force IPv4) in `database/mongoose.ts` and `scripts/test-db.mjs`.
- **Market data**: Finnhub API (`NEXT_PUBLIC_FINNHUB_API_KEY` — exposed to browser). Revalidation caching: profiles 24h, news 5min, search 30min.
- **Charts**: TradingView embeddable widgets via `components/TradingViewWidget.tsx`. Config objects in `lib/constants.ts`.
- **Symbol format**: `formatSymbolForTradingView()` maps Finnhub dot-suffix (e.g. `2330.TW`) → TradingView colon-prefix (`TWSE:2330`). Mapping table in `lib/utils.ts`.
- **Background jobs**: Inngest (`lib/inngest/`). Functions served at `app/api/inngest/route.ts`:
  - `sign-up-email`: event `app/user.created` → AI welcome email
  - `weekly-news-summary`: cron `0 9 * * 1` → Kit broadcast
  - `check-stock-alerts`: cron `*/5 * * * *` → price condition check
  - `check-inactive-users`: cron `0 10 * * *` → re-engagement
- **AI**: Multi-provider with fallback. `AI_PROVIDER` env var (default `gemini`). Fallback: if Gemini → MiniMax or Siray; if MiniMax/Siray → Gemini. Providers in `lib/ai-provider.ts`.
- **Email**: Nodemailer (Gmail) for transactional + Kit (ConvertKit v3/v4) for broadcasts/newsletters.
- **Types**: Global declarations in `types/global.d.ts` — no imports needed.
- **Config**: Tailwind CSS v4 (`@tailwindcss/postcss`), no `tailwind.config.ts`. shadcn/ui new-york style (see `components.json`). Dark theme by default (`<html className="dark">`).

## Notable settings

- **`next.config.ts`**: `eslint.ignoreDuringBuilds: true`, `typescript.ignoreBuildErrors: true`, `devIndicators: false`. Build will NOT fail on lint or type errors.
- **`vitest.config.ts`**: Globals enabled (`vi`, `describe`, `it`, `expect`), Node environment (not jsdom), `@/` alias.
- **`.gitignore`**: `.env*` ignores ALL `.env` files (no `.env.example` exception).
- **Docker**: `docker compose up -d mongodb && docker compose up -d --build` (sequential, not parallel).

## Testing

```sh
pnpm test                 # vitest run
pnpm test:watch           # vitest
pnpm test:db              # node scripts/test-db.mjs — requires MONGODB_URI in .env
```

- **Test files**: `__tests__/*.test.ts`. No per-package test commands — single `vitest run`.
- **Fixtures**: No dedicated fixture dir. Tests mock `fetch` via `vi.stubGlobal()` (see `ai-provider.test.ts`).
- **No CI workflows** — only `.github/FUNDING.yml`.

## Directory map

| Path | Purpose |
|---|---|
| `app/(auth)/` | Sign-in, sign-up, forgot/reset password pages |
| `app/(root)/` | Authenticated pages: dashboard, stocks/[symbol], search, watchlist, help |
| `components/ui/` | shadcn/Radix primitives (button, dialog, command, etc.) |
| `components/forms/` | InputField, SelectField, CountrySelectField |
| `components/stocks/` | StockSentimentCard |
| `database/models/` | Mongoose schemas: `watchlist.model.ts`, `alert.model.ts` |
| `lib/actions/` | Server actions (auth, finnhub, watchlist, user, alert, adanos) |
| `lib/inngest/` | Inngest client, function definitions, AI prompts |
| `lib/better-auth/` | `auth.ts` — Better Auth singleton |
| `lib/nodemailer/` | Transporter, templates, reset-password email |
| `types/global.d.ts` | Global type declarations (no import needed) |
| `lib/providers/` | Provider extension system — pluggable data source architecture (NEW) |
| `scripts/` | Utility scripts (test-db, kit migration, etc.) |

## Provider Extension Architecture

OpenStock uses a pluggable Provider pattern for data sources. All new code lives under `lib/providers/` — **zero** modifications to existing source files.

```ts
import { getMarketProvider, getMarketProviderForSymbol }
  from '@/lib/providers';

const provider = getMarketProvider(); // env-driven: finnhub|tushare|stock-sdk
const quote = await provider.getQuote('AAPL');
```

**Three independent interfaces** (each in `lib/providers/core/types.ts`):
- `MarketDataProvider` — stock quotes, company profiles, search, news, watchlist data
- `SentimentProvider` — cross-source sentiment snapshots
- `TradingCalendarProvider` — is-trading-day, next/prev trading day, market hours

**Provider selection** via env vars:
- `MARKET_DATA_PROVIDER=finnhub|tushare|stock-sdk` (default `finnhub`)
- `SENTIMENT_PROVIDER=adanos` (default)
- `CALENDAR_PROVIDER=us|ashare` (default `us`)

**Multi-market auto-routing**: `getMarketProviderForSymbol('600519.SH')` → Tushare, `getMarketProviderForSymbol('AAPL')` → Finnhub.

**Adding a new Provider** (3 files, 0 modifications elsewhere):
1. Implement the interface in `lib/providers/<domain>/<name>/provider.ts`
2. Create `index.ts` calling `registerXxxProvider('<name>', factory)`
3. Add conditional import in `lib/providers/core/index.ts` (if optional)

**Existing Adapters** (wrap upstream code without modifying it):
- `FinnhubAdapter` → wraps `@/lib/actions/finnhub.actions`
- `AdanosAdapter` → wraps `@/lib/actions/adanos.actions`

## Gotchas

- **Server actions import directly** — no API route layer (e.g. `import { getQuote } from '@/lib/actions/finnhub.actions'`). They are `'use server'` functions.
- **Inngest local dev** is a SEPARATE process from `pnpm dev`. Run `npx inngest-cli@latest dev` in another terminal.
- **Sign-up flow** triggers `app/user.created` Inngest event. If Inngest isn't running locally, the AI welcome email won't send but signup still succeeds.
- **`NEXT_PUBLIC_FINNHUB_API_KEY`** is client-side accessible. Keep its rate-limit tier in mind.
- **Middlewar at `middleware/index.ts`**, not root `middleware.ts`. Next.js uses the `middleware/index.ts` convention but an agent might look for the root file.
- **API_DOCS.md** references Kit (ConvertKit) endpoints that differ from actual `lib/kit.ts` implementation — verify against code, not docs.
