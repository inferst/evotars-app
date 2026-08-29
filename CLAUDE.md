# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Evotars is a web-based OBS overlay that renders animated avatars ("evotars") for a Twitch streamer's chatters. The backend ingests Twitch chat/events and pushes them over Socket.io to a browser overlay. The actual sprite rendering lives in the external `evotars` npm package (pinned, not in this repo); this repo is the surrounding platform: API, auth, admin dashboard, overlay client, and marketing website.

## Monorepo layout

Turborepo + pnpm workspaces (`pnpm-workspace.yaml`). Package manager is pinned to `pnpm@10.10.0`.

- `apps/api` — **NestJS** backend. Auth, Twitch integration, Socket.io gateway, admin REST API, serves the built `admin` and `client` SPAs as static assets under `/admin` and `/client`. The core of the system.
- `apps/admin` — React 19 + Vite SPA (the streamer's settings dashboard). Radix UI + Tailwind v4, TanStack Query, react-hook-form, i18next, react-router.
- `apps/client` — The OBS browser-source overlay. Thin Vite/TS app that wraps the `evotars` package and connects to the Socket.io feed.
- `apps/website` — Next.js 15 marketing site (MDX), independent of the rest.
- `packages/database` — Prisma schema, generated client, migrations, and DB seed. Exported as `@repo/database`.
- `packages/types` — `@repo/types`: shared DTOs + Zod schemas, including the Socket.io event contract used by both `api` and `client`.
- `packages/eslint-config`, `packages/typescript-config` — shared configs.

## Commands

Run from the repo root; Turbo fans tasks out across the workspace.

```shell
pnpm install              # install all workspaces
pnpm run dev              # turbo dev — runs all apps in watch mode (persistent)
pnpm run build            # turbo build
pnpm run lint             # turbo lint (see note below)
pnpm run db:migrate:dev   # prisma migrate dev (generates client + applies migrations)
pnpm run db:migrate:deploy
pnpm run db:seed          # seeds actions, commands, skins
```

Target a single app with a Turbo filter, e.g. `pnpm exec turbo dev --filter=api` or `pnpm exec turbo lint --filter=admin`. You can also `cd apps/api && pnpm dev`.

**Lint is not uniform across apps.** `api` and `admin` run ESLint; `website` runs `next lint`; **`client`'s `lint` script is actually `tsc --noEmit`** (typecheck, not ESLint). When changing `client`, run its lint to typecheck.

**Prisma client generation is automatic**: `@repo/database`'s `predev`/`prebuild` run `prisma generate`, and Turbo wires these ahead of `dev`/`build`. You normally don't run `prisma generate` by hand.

**There is no test suite** — no test runner or test scripts are configured in any package. Don't assume `pnpm test` exists.

## Local dev gotchas

- **`DATABASE_URL` in `.env` points at the Docker hostname `evotars-postgres`**, i.e. dev is set up to run inside the devcontainer (`.devcontainer/`). To run the API directly on the host instead, switch `DATABASE_URL` to the commented-out `localhost:5432` line.
- Infra (Postgres + nginx) comes up via `docker compose -f compose.dev.yaml up -d`. **nginx on port 80 is the front door**: it reverse-proxies `/api`, `/admin`, `/client`, `/socket.io` to the API (`:3000`), `/twitch` to the EventSub listener (`:3001`), and `/7tv-emotes/` to the 7TV CDN (to bypass CORS). The API/SPAs are reached through nginx (`http://localhost/...`), not directly.
- Twitch OAuth requires real `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` for end-to-end auth.

## Architecture

### Real-time data flow (the heart of the app)

`apps/api/src/admin/services/socket.service.ts` is the orchestrator. When an overlay connects:

1. The overlay (`apps/client`) connects to Socket.io with `auth.userGuid` = the trailing segment of its overlay URL.
2. `SocketService` resolves the user by GUID, rejects if missing or token-revoked, and joins a **room keyed by the user GUID**. Multiple overlay tabs share one room.
3. The **first** client in a room spins up one `EventClient` (Twitch) and one `EmoteClient` (7TV/BTTV/FFZ aggregate); the **last** client leaving tears them down. This is the main lifecycle invariant — Twitch/emote connections are per-room, not per-socket.
4. Incoming Twitch events are transformed and emitted to the room as Socket.io events: `message`, `action`, `chatters`, `raid`, plus initial `settings`. The `evotars` package consumes these in `apps/client/src/app/app.ts`.

The event names/payloads are the typed contract in `packages/types/src/dto/socket.ts` (`ServerToClientsEvents` / `ClientToServerEvents`). Changing an event shape means updating `@repo/types` so both `api` and `client` stay in sync.

### Twitch integration (Twurple)

`apps/api/src/admin/twitch/twitch-client.factory.ts` wraps `@twurple`:

- `RefreshingAuthProvider` persists refreshed tokens back to `UserToken`; on refresh failure it flags `isTokenRevoked = true` and disconnects that user's clients.
- `ChatClient` delivers chat messages.
- `EventSubHttpListener` (HTTP webhooks, **not** WebSocket) handles channel point redemptions and raids. It runs on port `3001` behind a `ReverseProxyAdapter` with path prefix `/twitch` — matching the nginx route. `TWITCH_WEBHOOK_SECRET` must be set.
- Chatter lists are polled on an interval (not event-driven).

`TWITCH_PLATFORM_ID` and `TWITCH_SCOPE` are hardcoded in `apps/api/src/constants.ts`. The data model (`Platform`) is multi-platform-shaped (note the `// TODO: create YoutubeEventClientFactory`), but only Twitch is implemented.

### Action system (commands & channel-point rewards)

`apps/api/src/admin/services/action.service.ts` is the domain core. Both a chat **Command** and a channel-point **Reward** reference a shared **Action** (jump, dash, color, sprite, grow, resurrect, …). The handler:

- Matches an incoming message/redemption to a user's active Command/Reward, applies per-user-per-command cooldowns (in-memory `setTimeout` map), parses arguments from the message text into the action's declared `arguments`, and validates (e.g. color via `tinycolor`, sprite availability).
- Some actions mutate persistent chatter state — `!color`/`!sprite` update the `Chatter` row so the avatar's color/sprite persists across messages.

Available actions and their default commands are defined by the **seed** (`packages/database/src/seed/`). Note: a near-duplicate seed tree also exists under `apps/api/src/database/seed/`; `pnpm run db:seed` runs the `packages/database` one via Turbo.

### Auth

`apps/api/src/auth/` — Passport `passport-oauth2` strategy against Twitch (`twitch.strategy.ts`). Sessions are stored in Postgres via `@quixo3/prisma-session-store` (the `Session` model), configured in `apps/api/src/main.ts`. `AuthModule` and `AdminModule` are mounted under `/auth` and `/admin` via Nest's `RouterModule`; the global prefix is `/api`. Guards live in `auth/guards` (`auth.guard`, `admin.guard`, `twitch-auth.guard`).

### Database & typed JSON columns

Prisma schema: `packages/database/prisma/schema.prisma`. Several columns are `Json` but **strongly typed** via `prisma-json-types-generator`: the `/// [TypeName]` doc-comments in the schema map to types declared in the `PrismaJson` global namespace in `packages/database/src/client.ts` (`SettingsData`, `ActionData`, `ActionableData`). To change the shape of a settings/action JSON blob, edit that namespace, not just the schema.

## Conventions

- API code uses the `@/*` path alias for `apps/api/src/*` (see `apps/api/tsconfig.json`). Modules follow the NestJS controller / service / repository split.
- The API is the only thing serving the overlay and admin SPAs in production: `ServeStaticModule` serves `apps/client/dist` at `/client` and `apps/admin/dist` at `/admin`, so those must be built before the API serves them.
- `VITE_API_URL`, `VITE_CLIENT_SOCKET_HOST` and the Twitch/session env vars are declared in `turbo.json`'s `globalEnv` — add new env vars there too or Turbo will warn/ignore them.
