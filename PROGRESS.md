# ecommerce-frontend — Progress

| Phase               | Status               |
| ------------------- | -------------------- |
| 0. Setup (frontend) | ✅ Done (2026-11-03) |
| 1. Auth & Users     | ✅ Done (2026-11-04) |
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

(Phase 1 items from this list are now done; see the Phase 1 section.)

- Auth pages, `useMe()`, protected routes and optimistic redirects in `proxy.ts`, Turnstile (Phase 1)
- Zustand stores (`src/stores/` is empty until the first UI state, e.g. the cart drawer)
- Storefront and admin layouts, SEO metadata, sitemap and robots (Phases 2–3)
- [x] GitHub remote: https://github.com/codiologist/ecommerce-frontend
- [ ] Set up Dependabot/Renovate in the GitHub repo settings

---

## Phase 1 — Auth & Users (frontend)

### Built

- **Pages:**
  - `(auth)`, all noindex: `/login` (credentials → CAPTCHA when the backend asks for it → 2FA code or
    backup-code step), `/register`, `/verify-email` (explicit click, so email link-scanners can't burn the
    single-use token), `/forgot-password`, `/reset-password`
  - `(account)`, guarded: `/account` (profile, email-verified badge, resend verification) and
    `/account/security` (change password, 2FA setup with QR and one-time backup codes, 2FA disable behind
    a reauth dialog, active sessions with per-device sign-out, log out of all devices)
  - `/admin`, guarded: login → staff role → 2FA set up (otherwise forced `/admin/setup-2fa`) → session
    2FA-verified. Customers see "Access denied". The dashboard itself is a placeholder until Phase 8.
  - The `(shop)` header has an account menu (log in / register, or the user menu with an admin link for
    staff).
- **Data (§7):**
  - `features/auth/{api,queries,mutations,schemas,types}.ts`, plus `authKeys` / `adminKeys` in
    `query-keys.ts`.
  - `useMe()` returns `null` when logged out and never redirects, so it's safe on public pages. Auth state
    lives only in the query cache.
  - Login and 2FA completion clear the cache and seed `me`; logout, logout-all and password reset clear
    it. Other mutations invalidate exactly the keys they affect (sessions, me, admin session).
  - Forms use react-hook-form + Zod for client-side feedback; backend errors (`body.<field>`) are mapped
    onto the matching fields (`lib/form-errors.ts`), and raw 5xx messages are never shown.
- **api-client additions:**
  - CSRF bootstrap: a single-flight `GET /auth/csrf` before the first non-GET request when there's no
    cookie, and one retry on `CSRF_TOKEN_INVALID`.
  - `authRedirect: false` for calls made from public pages.
  - Response bodies are always drained. This was a **bug found by E2E**: unread bodies on the CSRF and
    refresh calls held connections open, and browsers allow about 6 per host.
- **`proxy.ts`:** optimistic redirect from `/account*` and `/admin*` to `/login?next=…` when there's no
  access cookie. The login page silently refreshes an expired-access-token session and returns the user.
  `safeNextPath()` blocks open redirects (`//x`, `/\x`, schemes, control characters, encoded variants,
  auth pages).
- **CSP kept strict:**
  - The root layout reads the per-request nonce and `NonceProvider` passes it to Radix's style injection
    (`get-nonce`), input-otp and the Turnstile script.
  - `frame-src` and `script-src` allow `https://challenges.cloudflare.com`.
  - E2E asserts zero CSP violations across the auth flow, including the QR and OTP screens.
- **Turnstile:** `@marsidev/react-turnstile`, shown on register and after `CAPTCHA_REQUIRED` on login, and
  re-mounted after each attempt (tokens are single-use). With no site key (local dev) it shows "CAPTCHA
  disabled" and sends a placeholder, which the backend accepts only when it also has no secret.
- **Accessibility:** labelled inputs, `aria-invalid` and `aria-describedby` on errors, `role="alert"` and
  `role="status"` messages, `aria-current` in navigation, a single h1 per page.
- **Tests:**
  - Vitest, 76: api-client (+CSRF bootstrap, single-flight, retry, `authRedirect`), safe redirects, error
    mapping, login form (validation, success, wrong credentials, CAPTCHA escalation, 2FA, backup code,
    expired challenge), register (server policy errors, generic result), account menu (logged out without
    redirect; admin link only for staff), sessions list (current device, revoke, logout-all), 2FA section
    (backup codes survive the `me` refetch; staff can't disable; reauth before disabling), proxy redirects
    and CSP.
  - Mutation-checked: removing the backup-code fix fails the tests.
  - Playwright, 4: smoke ×2, the full auth flow, and customer → admin "Access denied".

### Decisions / deviations (please review)

1. **`@hookform/resolvers` 5.9.2, not 7.0.2:** the 7.x line was 3 days old with 3 patches already.
   5.9.2 supports Zod 4.
2. **shadcn CLI output corrected:**
   - It installed shadcn's new `cn` package (pre-1.0, updated the day before) and pointed components at
     it; they now use our existing `@/lib/utils`.
   - It added `next-themes` with a `^` range, which was removed.
   - **sonner was dropped**: it injects a `<style>` tag without a nonce, which the production CSP blocks.
     Inline form messages are used instead.
3. **`Button` gained `asChild`** (Radix Slot), so links can be styled as buttons.
4. **Optimistic proxy redirect uses only the access cookie.** The refresh cookie is path-scoped to
   `/api/v1/auth` and invisible to Next. After 15+ minutes idle a protected-page visit briefly bounces via
   `/login`, which refreshes and returns the user. A non-secret "session hint" cookie from the backend
   would avoid the bounce; it wasn't added, to keep the backend unchanged.
5. **Auth E2E needs a disposable backend:** `E2E_API_URL=http://localhost:4100/api/v1 npm run test:e2e`.
   Without it (e.g. in CI) that spec is skipped. Locally it ran against a backend on port 4100 using the
   Docker database `ecommerce_e2e`, never Supabase.
6. React 19.3 deprecates `FormEvent`; `SubmitEvent<HTMLFormElement>` is used.

### Pending

- [ ] Admin 2FA E2E (needs a way to create a staff user in the E2E backend, e.g. a test-only seed).
- [ ] Production: set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (and the backend secret).
- [ ] Backend follow-up, not done because it's backend Phase 0 code: the health check's 2s DB timeout is
      shorter than a cold Supabase connection from this region (~2.7s), so `/health` can briefly report
      `degraded` after idle.

### Scripts

`dev`, `build`, `start`, `typecheck`, `lint`, `format`, `format:check`, `test`, `test:e2e`, `audit:ci`.
