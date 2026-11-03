# ecommerce-frontend — Progress

| Phase               | Status               |
| ------------------- | -------------------- |
| 0. Setup (frontend) | ✅ Done (2026-11-03) |
| 1. Auth & Users     | ⏳ Not started       |
| 2–10                | ⏳ Not started       |

Backend status lives in `ecommerce-backend/PROGRESS.md`.

---

## Phase 0 — Setup (frontend)

### Built

- **Stack (exact pins):** Next.js 16.4.4 (App Router, Turbopack), React 19.3.1, TanStack Query 5.105.3
  (+ Devtools, dev only), Tailwind CSS 4.3.4 + shadcn (new-york, neutral, CSS variables), Zod 4.6.7,
  Vitest 5.1 + Testing Library + jsdom, Playwright 1.64.1, Node `>=26` (`.nvmrc` = 26).
- **TypeScript:** `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `@/*` path alias.
- **Lint/format:** ESLint flat config: `eslint-config-next` (core-web-vitals + typescript) plus
  `typescript-eslint` strict/stylistic type-checked, `import/order`, `react/no-danger`, and a ban on
  `localStorage`/`sessionStorage` (§3). Prettier with the Tailwind plugin. Husky pre-commit runs
  lint-staged and the type-check.
- **Public env:** `src/env.ts` validates `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` and
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` with Zod; build and start fail if they're invalid. `.env.example` holds
  only public values.
- **Security headers (§4.3):**
  - `next.config.ts` sets `X-Frame-Options: DENY`, `nosniff`,
    `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, COOP, HSTS (production
    only), `poweredByHeader: false` and an empty `images.remotePatterns`.
  - `src/proxy.ts` (Next 16 proxy) sets a **per-request nonce CSP** built in `src/lib/csp.ts`:
    `script-src 'self' 'nonce-…' 'strict-dynamic'` and `style-src` with a nonce in production;
    `frame-ancestors 'none'`, `object-src 'none'`, `connect-src` limited to `'self'` plus the API origin.
    Dev adds only `'unsafe-eval'`, inline styles and `ws:` for HMR.
- **`src/lib/api-client.ts` (§7):**
  - `credentials: 'include'` on every request
  - `X-CSRF-Token` from the `csrf_token` cookie on non-GET requests
  - unwraps `{ success, data, meta }` and normalizes every failure into `ApiError` (status, code, details,
    requestId; `NETWORK_ERROR` and `UNEXPECTED_RESPONSE` included)
  - on 401: one shared (single-flight) `POST /auth/refresh`, then one retry; if refresh fails, calls the
    auth-failure handler. Auth endpoints never trigger a refresh.
- **`src/lib/query-client.ts`:** staleTime 60s, no retries on 4xx (up to 2 for network/5xx),
  `refetchOnWindowFocus: false` by default, mutations never retried. A new client per request on the
  server, a singleton in the browser. Pending queries are dehydrated, for streaming.
- **`src/lib/query-keys.ts`:** query key factory (`healthKeys`).
- **`src/app/providers.tsx`:** `QueryClientProvider`; Devtools load only when
  `NODE_ENV === 'development'` (dynamic import, not in production bundles). Registers the auth-failure
  handler, which clears the query cache and sends the user to `/login?next=…`.
- **Home page `(shop)/page.tsx`:** placeholder showing the §7 SEO pattern. It runs the server
  `queryClient.query(healthQueryOptions())` with the same `queryOptions` as the client, then
  `HydrationBoundary`, then the client `useQuery`. It shows the backend status: online/DB up, DB down or
  unreachable.
- **`features/health/`:** `api.ts`, `queries.ts`, `types.ts`, `components/api-status.tsx` (the pattern
  every later feature follows).
- **App shell:** `layout.tsx` (`metadataBase` from env, system font stack, no external font fetch),
  `not-found.tsx`, `error.tsx` and `global-error.tsx`. The error pages never render `error.message`.
- **shadcn:** `components.json`, theme tokens in `globals.css`, `components/ui/button.tsx`, and `cn()`.
- **Tests:**
  - Vitest, 30 passing:
    - api-client: envelope/meta, credentials, the CSRF header on non-GET only, error normalization,
      network errors, 204, accepted 503, refresh-and-retry, a single refresh for concurrent 401s,
      refresh failure calling the handler, no refresh loop, no refresh on auth endpoints
    - query-client retry rules and defaults
    - env validation
    - CSP builder and proxy nonce
    - `<ApiStatus />` states
  - Playwright, 2 passing: the home page renders with nonce CSP and security headers and **no CSP
    violations in the console**, and unknown routes return 404.
- **CI:** `.github/workflows/ci.yml` runs `npm ci`, lint, format check, type-check, unit tests,
  `npm audit --audit-level=high`, build and Playwright E2E.
- **Verified live:** `next start` against the running backend renders "API online · database up" (the
  real Supabase connection); the nonce is applied to all Next scripts.

### Decisions / deviations (please review)

1. **ESLint 9.39.5 (not 10) in the frontend.** `eslint-config-next@16.4.4` depends on
   `eslint-plugin-import@2.32.0`, which supports ESLint only up to `^9`. With ESLint 10 the `import/order`
   rule crashes (`sourceCode.getTokenOrCommentBefore is not a function`). 9.39.5 is the current 9.x
   maintenance release. The backend stays on ESLint 10 (it doesn't use the Next config). Move to 10 when
   `eslint-config-next` supports it.
2. **TypeScript 7 + TS 6 side by side**, the same setup as the backend:
   - `typescript` resolves to `@typescript/typescript6@6.0.2`; typescript-eslint and Next's built-in
     build-time type check use it.
   - `typescript7` is TS 7.0.2; `npm run typecheck` uses it.
   - Both run in CI.
3. **TanStack Query 5.105 deprecations:** `prefetchQuery` → `queryClient.query(options).catch(noop)`, and
   `isServer` → `environmentManager.isServer()`.
4. **Nonce CSP makes every HTML page dynamically rendered** (no static or ISR HTML), which is the
   documented Next.js trade-off. Revisit in Phase 3/10 if catalog pages need ISR; the option would be a
   hash-based or relaxed policy for those routes only.
5. **Production `style-src` uses a nonce, with no `'unsafe-inline'`.** Server-rendered inline `style="…"`
   attributes are blocked; styles set from JS are not affected. If a later shadcn/Radix component
   needs SSR inline styles, add `'unsafe-inline'` to `style-src` only (low risk compared with
   `script-src`) and record it here.
6. `upgrade-insecure-requests` is added only when `NEXT_PUBLIC_SITE_URL` is https. Otherwise a local
   `next start` would upgrade calls to `http://localhost:4000` to https and break them.
7. The auth-failure handler redirects to `/login`, which doesn't exist until Phase 1. In Phase 0 it never
   fires, because no endpoint returns 401 yet.
8. **Topology (§2.3):** local dev is `localhost:3000` → `localhost:4000` (same-site). In production use
   `example.com` + `api.example.com`; no rewrites needed.
9. Remaining `npm audit` findings: the same moderate, dev-only `minimatch` advisory as the backend (the
   ESLint toolchain). No high or critical.

### Pending / not done on purpose (later phases)

- Auth pages, `useMe()`, protected routes and optimistic redirects in `proxy.ts`, Turnstile (Phase 1)
- Zustand stores (`src/stores/` is empty until the first UI state, e.g. the cart drawer)
- Storefront and admin layouts, SEO metadata, sitemap and robots (Phases 2–3)
- Add the GitHub remote and push; set up Dependabot/Renovate

### Scripts

`dev`, `build`, `start`, `typecheck`, `lint`, `format`, `format:check`, `test`, `test:e2e`, `audit:ci`.
