# Project memory

Context for anyone (or any future session) picking this project up. Read this and `application-flow.md` first.

## Status (2026-10-16)

- Live: https://kenn-pit-wall.vercel.app (alias; also https://f1-pit-wall-iota.vercel.app). Vercel project `ken-vercel-062926/f1-pit-wall`, Root Directory `web`, git-connected: every push to `main` deploys. Note `f1-pit-wall.vercel.app` belongs to someone else.
- Repo: https://github.com/kennjaramilla/f1-pit-wall (public)
- Races cached: 9839 Abu Dhabi 2025, 9947 Britain 2025, 9912 Italy 2025
- Tests: xUnit 11, Vitest 49, Cypress 14, all green locally. CI runs dotnet build/test plus web lint, typecheck, Vitest and build.
- Vercel env: `AUTH_SECRET` (production). The API needs the same value as `Auth__Secret` in live mode.

## How to update

| Task | Command |
| --- | --- |
| Add a race | `cd api && dotnet run -- ingest <sessionKey>`. Find keys with `https://api.openf1.org/v1/sessions?year=2025&session_name=Race`. |
| Refresh the snapshot | `cd api && dotnet run -- export ../web/public/data`, then commit `web/public/data` |
| Redeploy | push to `main` (git-connected), or from the repo root: `npx vercel@latest deploy --prod --yes` (Root Directory is `web`) |
| Run live mode | API: `Auth__Secret=… dotnet run --urls http://localhost:5101`. Web: `NEXT_PUBLIC_DATA_MODE=live API_URL=http://localhost:5101 npm run dev`. |
| Tests | `dotnet test`; `cd web && npm test`; `npm run build && npm run e2e:ci` |

## Gotchas

- **OpenF1 is slow and stalls mid-body.** An `intervals` call once hung for more than 5 minutes. The resilience handler only times out on headers, so `BufferContentHandler` (an inner handler) downloads the body *inside* each attempt, which makes timeouts and retries cover stalls. Raw responses are cached in `api/db/openf1-cache`, so re-ingesting is instant.
- The `intervals` endpoint is never used: gaps are computed from laps and GPS.
- The DB lives in `api/db/`. Not `api/data/`: macOS is case-insensitive and that path collides with the `Data/` code folder.
- SQLite/EF Core can't `ORDER BY` a `DateTimeOffset`; order in memory after projecting.
- Next 16: `middleware.ts` is now `proxy.ts`; `cacheComponents` is on, so anything reading cookies or params sits inside `<Suspense>`.
- jose in Vitest needs `// @vitest-environment node` (jsdom has a different `Uint8Array` realm).
- `fetchBaseQuery` builds a `Request`, which needs an absolute URL in tests, so the base URL is prefixed with `window.location.origin`.
- The commit message `a2abec9 "drop generated agent notes"` should be reworded to something neutral. Rewriting history needs a force-push, which was not run.

## Design decisions & trade-offs (talking points)

- **Snapshot mode.** Vercel can't host .NET, and the demo must not depend on a slow third-party API or a cold backend. The API exports its own responses, so the DTOs stay the single contract: the same RTK Query endpoints read either the files or the API. Trade-off: snapshot data is only as fresh as the last export.
- **SQLite + EF Core.** Read-mostly, single-writer and tiny (about 10 MB per race). The file deploys with the app and needs no server. In production I'd use Postgres (or DynamoDB on AWS serverless) behind the same `RaceQueries` service.
- **Downsampling.** OpenF1 GPS is about 3.7 Hz per car (around 20k points per car per race). Ingestion linearly resamples it onto a fixed 500 ms grid and drops frames that bridge a gap of more than 4 s, so the car disappears instead of teleporting. The replay endpoint ships those frames as interleaved int arrays (about 2–3 MB per race before gzip). The browser interpolates between frames at 60 fps. Telemetry is kept only for each driver's fastest lap, with distance integrated from speed (trapezoid rule) and x/y attached by time.
- **Gaps from GPS progress.** Timing-line gaps go stale while a car is in the pits, which made the tower look wrong. Projecting GPS onto the track outline and comparing against the race front keeps gaps consistent with the running order (see application-flow.md).
- **Redux Toolkit + RTK Query.** Requested to mirror NgRx. NgRx to RTK mapping:
  - actions + reducers → `createSlice` (`replaySlice`, `telemetrySlice`)
  - selectors → `createSelector` (`store/selectors.ts`; the leaderboard at time t is a memoised selector over the RTK Query cache)
  - effects for HTTP → RTK Query endpoints (caching, loading and error state, dedupe)
  - other side effects → `listenerMiddleware` (not needed yet)
  - Store module per feature → `combineSlices`. The store is created per request in `StoreProvider`, never as a module singleton.
- **60 fps outside Redux.** See application-flow.md: an rAF clock drives the SVG directly and syncs to Redux at about 5 Hz. The cost is two clocks to keep consistent; `seekId` makes that explicit.
- **Auth: BFF plus httpOnly cookie.** The token never reaches JavaScript, which removes XSS token theft. The Next.js route attaches it as a Bearer token for the API. A shared-secret HS256 JWT keeps the demo self-contained. In production on AWS I'd use Cognito or another OIDC provider (asymmetric keys, JWKS rotation, MFA) and keep the same policy-based checks in .NET. UI gating is UX only; the proxy and the API enforce access.
- **Least privilege and audit** (HIPAA-style "minimum necessary"): roles inherit upward from one permission table that is checked server-side. An audit log of sign-ins and admin actions is on the roadmap.
- **Accessibility as a feature:** keyboard shortcuts, native `<dialog>`, WAI-ARIA tabs, tyre letters as well as colours, dashed teammate lines, AA contrast, reduced-motion support, axe in CI-ready Cypress specs.

## Race notes (demo mode)

- Strategist and Admin can pin notes (title, note, category, lap) to a race. Viewers see a locked tab.
- `notesSlice` uses `createEntityAdapter`. A listener middleware (`notesPersistence`) writes the user's notes to `localStorage["pitwall:notes:<userId>"]`. `StoreProvider` hydrates them after mount because localStorage is browser-only.
- Selectors filter by the session's user id, so users only see their own notes. Deletes are soft (`deletedAt`) for retention and audit.
- Notes appear as markers above the scrubber and in the Notes tab. Clicking either seeks to that lap.
- This is not real security: localStorage is device-local and user-editable. The server-side version is on the roadmap.

## Known issues

- Track map labels can overlap when cars bunch up (start, safety car restarts).
- Live-mode re-ingest has an Admin-only endpoint, but the admin page button is always disabled.
- Vercel aliases added with `vercel alias set` sit behind Vercel SSO. Public URLs must be added as project domains, as `kenn-pit-wall.vercel.app` is.
- Screen readers read the timing tower in car-number DOM order. Rows are positioned visually with transforms so they can animate.

## Next steps (roadmap; cut for time)

1. Audit log (sign-ins, admin actions) with masked emails for non-self views.
2. Server-side race notes with an ownership check (404 for other users' notes, so their existence isn't leaked), plus "download my data" and "delete my notes". Notes currently live in localStorage per user (demo mode).
3. Lambda hosting (`Amazon.Lambda.AspNetCoreServer.Hosting`) plus a SAM template with the SQLite file bundled read-only; then CDK or SAM deploy from CI.
4. Cypress in CI (`cypress-io/github-action` against `next start`).
5. Observability: structured JSON logs, correlation IDs, request logging, web vitals reporting, an error boundary.
6. Security headers and rate limiting (`AddRateLimiter`) on the API.
7. SignalR to stream replay frames in live mode.
8. docker-compose for API plus web in live mode. The API Dockerfile builds and runs (verified on port 5177: `/health` 200, anonymous `/api/races` 401); it starts with an empty DB, so ingest or mount `api/db`.
9. More races; sector-level timing; driver focus mode on the track map.
