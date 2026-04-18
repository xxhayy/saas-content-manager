# AirOne Studio — Project Reference

## 1. General Context

**AirOne Studio** is a SaaS content-management platform built with the [T3 Stack](https://create.t3.gg/) (Next.js 15 App Router, Prisma, TypeScript, Tailwind CSS v4). It is described as an "all-in-one ad content manager."

### Core Workflow

1. **Authentication** — Users sign up / sign in via email+password or GitHub OAuth, powered by [Better Auth](https://better-auth.com/).
2. **Asset Upload** — Users upload source images (from local files or Google Drive) and assign them to a category: **Furniture**, **Commerce Product**, or **Avatar**.
3. **AI Processing** — Each uploaded image is sent to the [kie.ai](https://kie.ai/) image-generation API with a category-specific prompt optimised for white-background extraction and studio-quality output. The API processes assets asynchronously and notifies the app via webhook on completion. 
4. **Image Storage** — Original uploads go to [ImageKit](https://imagekit.io/) (`/assets/originals`). When kie.ai finishes processing, the cleaned result is also uploaded to ImageKit (`/assets/clean`).
5. **Asset Management** — Users browse, search, filter by category, rename, delete, and download their assets (individually or in bulk ZIP archives) from a dashboard.

### Key Technologies

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, React 19) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL via Prisma ORM |
| Auth | Better Auth with Prisma adapter + GitHub OAuth |
| Styling | Tailwind CSS v4 + shadcn/ui (radix-nova style) |
| File Storage | ImageKit (upload + CDN) |
| AI Processing | kie.ai API (nano-banana-2 model) |
| Google Drive | Google Picker API for file imports |
| Deployment | Vercel |
| Package Manager | npm 11.6.1 |

---

## 2. Project Tree

```
aironestudio2/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       ├── 20260318233024_initial_columns/
│       └── migration_lock.toml
├── public/
│   └── favicon.ico
├── src/
│   ├── env.js
│   ├── styles.d.ts
│   ├── actions/
│   │   └── assets.ts
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   └── auth/
│   │   │       └── [path]/
│   │   │           └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   └── dashboard/
│   │   │       ├── page.tsx
│   │   │       ├── loading.tsx
│   │   │       └── assets/
│   │   │           ├── page.tsx
│   │   │           ├── assets-client.tsx
│   │   │           ├── loading.tsx
│   │   │           └── new/
│   │   │               ├── page.tsx
│   │   │               └── loading.tsx
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...all]/
│   │       │       └── route.ts
│   │       ├── assets/
│   │       │   ├── route.ts
│   │       │   ├── [id]/
│   │       │   │   └── route.ts
│   │       │   ├── recent/
│   │       │   │   └── route.ts
│   │       │   └── upload/
│   │       │       └── route.ts
│   │       ├── upload-auth/
│   │       │   └── route.ts
│   │       └── webhooks/
│   │           └── kie-ai/
│   │               └── route.ts
│   ├── components/
│   │   ├── app-sidebar.tsx
│   │   ├── mobile-sidebar-wrapper.tsx
│   │   ├── providers.tsx
│   │   ├── sidebar1.tsx
│   │   ├── theme-provider.tsx
│   │   ├── assets/
│   │   │   ├── asset-card.tsx
│   │   │   └── asset-upload-zone.tsx
│   │   ├── sidebar/
│   │   │   └── breadcrumb-page-client.tsx
│   │   └── ui/
│   │       ├── badge.tsx
│   │       ├── breadcrumb.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── collapsible.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── mobile-sidebar-close.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── sheet.tsx
│   │       ├── sidebar.tsx
│   │       ├── skeleton.tsx
│   │       ├── sonner.tsx
│   │       ├── tabs.tsx
│   │       └── tooltip.tsx
│   ├── hooks/
│   │   ├── use-mobile.ts
│   │   └── useIsMobile.ts
│   ├── lib/
│   │   ├── auth-client.ts
│   │   ├── auth.ts
│   │   └── utils.ts
│   ├── server/
│   │   ├── db.ts
│   │   ├── imagekit.ts
│   │   ├── kie-ai.ts
│   │   └── better-auth/
│   │       ├── index.ts
│   │       ├── config.ts
│   │       ├── client.ts
│   │       └── server.ts
│   └── styles/
│       └── globals.css
├── components.json
├── eslint.config.js
├── next.config.js
├── package.json
├── postcss.config.js
├── prettier.config.js
├── start-database.sh
└── tsconfig.json
```

---

## 3. File Descriptions

### Root Configuration

| File | Purpose |
|---|---|
| `package.json` | Project metadata and dependencies. Project name is `aironestudio`, bootstrapped from create-t3-app v7.40.0. Key scripts: `dev`, `build`, `db:generate`, `db:migrate`, `db:push`, `db:studio`. |
| `tsconfig.json` | TypeScript configuration. Strict mode enabled with `noUncheckedIndexedAccess`. Path alias `@/*` maps to `./src/*`. ESNext module with bundler resolution. |
| `next.config.js` | Next.js config. Imports `src/env.js` for build-time env validation. Configures `ik.imagekit.io` as an allowed remote image pattern for `next/image`. |
| `eslint.config.js` | Flat ESLint config using `typescript-eslint` with recommended + type-checked rules. Extends `next/core-web-vitals`. Prefers type-only imports. |
| `postcss.config.js` | PostCSS config using the `@tailwindcss/postcss` plugin (Tailwind CSS v4 style). |
| `prettier.config.js` | Prettier config with `prettier-plugin-tailwindcss` for automatic class sorting. |
| `components.json` | shadcn/ui configuration. Uses `radix-nova` style, `neutral` base color, CSS variables, and `lucide` icons. |
| `start-database.sh` | Shell script to spin up a local PostgreSQL container via Docker/Podman for development. |

---

### Prisma / Database

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Database schema using PostgreSQL via Prisma. Defines models: **User**, **Session**, **Account**, **Verification** (Better Auth tables), **Post** (unused scaffold), **Project** (stores ImageKit-hosted images), and **Asset** (the core model — tracks uploaded images, their AI processing status, kie.ai task IDs, and clean URLs). Enums: `AssetsStatus` (PROCESSING / COMPLETED / FAILED), `AssetCategory` (FURNITURE / COMMERCE_PRODUCT / AVATAR). |
| `prisma/migrations/` | Contains the initial migration (`20260318233024_initial_columns`) and lock file. |

---

### `src/env.js`

Environment variable validation using `@t3-oss/env-nextjs` with Zod schemas. Ensures all required secrets are present at build time. Set `SKIP_ENV_VALIDATION=true` to bypass.

**Required server-side secrets:**

| Variable | Description |
|---|---|
| `BETTER_AUTH_SECRET` | Auth secret (required in production) |
| `BETTER_AUTH_URL` | Auth base URL |
| `BETTER_AUTH_GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| `BETTER_AUTH_GITHUB_CLIENT_SECRET` | GitHub OAuth client secret |
| `DATABASE_URL` | PostgreSQL connection string (pooled/Prisma) |
| `DIRECT_URL` | PostgreSQL direct connection string (used for migrations) |
| `IMAGEKIT_URL_ENDPOINT` | ImageKit CDN URL endpoint |
| `IMAGEKIT_PUBLIC_KEY` | ImageKit public API key |
| `IMAGEKIT_PRIVATE_KEY` | ImageKit private API key |
| `INTERNAL_API_SECRET` | Internal API authentication secret |
| `KIE_AI_API_KEY` | kie.ai API key for image generation |
| `KIE_WEBHOOK_SECRET` | HMAC secret for verifying kie.ai webhook signatures |

**Required client-side variables:**

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Public-facing app URL |
| `NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY` | Google Drive API key |
| `NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID` | Google Drive OAuth client ID |
| `NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID` | Google Drive app ID for the Picker |

---

### `src/styles.d.ts`

TypeScript module declaration for `.css` file imports.

---

### Server Layer (`src/server/`)

| File | Purpose |
|---|---|
| `server/db.ts` | Singleton Prisma client. Caches the instance on `globalThis` in development to survive HMR (hot module replacement). Enables query logging in development. |
| `server/imagekit.ts` | Initializes the ImageKit SDK and exports a helper `uploadToImageKit(fileUrl, fileName, folder)` that downloads a file from a URL and re-uploads it to ImageKit. Used by the webhook to persist kie.ai output. |
| `server/kie-ai.ts` | Kie.ai API integration. Defines `CATEGORY_PROMPTS` — category-specific prompts optimised for white-background studio photography. Exports `submitTask(imageUrl, prompt, assetId)` which POSTs to the kie.ai `createTask` endpoint using the `nano-banana-2` model. Attaches a webhook callback URL containing the asset ID. |
| `server/better-auth/config.ts` | Core Better Auth configuration. Uses the Prisma adapter with PostgreSQL. Enables email+password auth and GitHub OAuth. Configures trusted origins for localhost, Vercel preview, and production URLs. Exports the auth instance and `Session` type. |
| `server/better-auth/client.ts` | Client-side Better Auth instance created via `createAuthClient()`. Exports the client and its inferred `Session` type. |
| `server/better-auth/server.ts` | Server-side helper that provides a cached `getSession()` function using React's `cache()` to deduplicate session lookups within a single request. |
| `server/better-auth/index.ts` | Barrel export — re-exports `auth` from `config.ts`. |

---

### Server Actions (`src/actions/`)

| File | Purpose |
|---|---|
| `actions/assets.ts` | Next.js Server Actions for asset data fetching. `getAssetsPage(page)` — paginated fetch (20 per page) of the current user's assets, ordered by newest first. `refreshAssets(take)` — re-fetches the first N assets for client-side polling (used to detect when PROCESSING assets complete). `getUserAssets()` — deprecated alias for `getAssetsPage(1)`. |

---

### API Routes (`src/app/api/`)

| File | Purpose |
|---|---|
| `api/auth/[...all]/route.ts` | Better Auth catch-all API handler. Delegates all `/api/auth/*` requests (sign-in, sign-up, session, etc.) to Better Auth via `toNextJsHandler`. |
| `api/assets/route.ts` | `GET` — Lists all assets for the authenticated user, with optional `?category=` filter. Returns JSON. |
| `api/assets/[id]/route.ts` | `PATCH` — Renames an asset (ownership-checked). `DELETE` — Deletes an asset (ownership-checked). |
| `api/assets/recent/route.ts` | `GET` — Returns the 5 most recent assets for the authenticated user. Used by the dashboard home page. |
| `api/assets/upload/route.ts` | `POST` — Receives an array of `originalUrls` and a `category`. Creates Asset records in PROCESSING state, then uses Next.js `after()` to asynchronously submit each image to kie.ai in the background. Returns immediately with the new asset IDs so the client doesn't wait for the AI API round-trips. Max 20 images per upload. |
| `api/upload-auth/route.ts` | `GET` — Generates ImageKit upload authentication parameters (token, signature, expire) for client-side direct uploads. Each call returns fresh credentials to prevent replay attacks. |
| `api/webhooks/kie-ai/route.ts` | `POST` — Webhook endpoint called by kie.ai when processing completes. Verifies HMAC signature (if configured), parses the result, downloads the generated image, uploads it to ImageKit's `/assets/clean` folder, and updates the asset record to COMPLETED with the clean URL. Handles duplicate webhooks and failure states. |

---

### App Pages (`src/app/`)

| File | Purpose |
|---|---|
| `app/layout.tsx` | Root layout. Sets up the Inter font, `ThemeProvider` (dark mode default), `TooltipProvider`, and `Toaster` (sonner). Defines global metadata (title: "AirOne Studio"). |
| `app/page.tsx` | Landing page. Simple welcome screen with a "Sign In" link directing to `/auth/sign-in`. |

#### Auth Route Group (`(auth)/`)

| File | Purpose |
|---|---|
| `(auth)/layout.tsx` | Auth layout with split-screen design: left panel shows branding (logo + heading on black grid background, desktop only), right panel renders the auth form. Wraps children in `Providers` for auth context. Mobile-responsive with a separate mobile logo. |
| `(auth)/auth/[path]/page.tsx` | Dynamic auth page using `@daveyplate/better-auth-ui`'s `AuthView` component. Statically generates pages for all auth views (sign-in, sign-up, forgot-password, etc.) via `generateStaticParams`. |

#### Dashboard Route Group (`(dashboard)/`)

| File | Purpose |
|---|---|
| `(dashboard)/layout.tsx` | Dashboard shell layout. Provides `SidebarProvider`, renders the `MobileSidebarWrapper` (sidebar), the header bar with `SidebarTrigger`, breadcrumbs, and the main content area. Uses a glassmorphic, rounded container design on desktop. |
| `dashboard/page.tsx` | Dashboard home page (server component). Fetches the user's session and 5 most recent assets from the database. Renders a welcome header, stats grid (placeholder values), quick action cards (New Project, New Asset), and a recent activity list showing asset thumbnails with status badges. Redirects to sign-in if unauthenticated. |
| `dashboard/loading.tsx` | Skeleton loading screen for the dashboard home page. Mirrors the layout of the actual page with skeleton placeholders for instant visual feedback during navigation. |
| `dashboard/assets/page.tsx` | Assets list page (server component). Calls `getAssetsPage(1)` server action to fetch the first page of assets, then passes them as initial data to the `AssetsClient` client component. Redirects on auth failure. |
| `dashboard/assets/assets-client.tsx` | Assets management client component. Features: tabbed category filtering (All / Furniture / Commerce / Avatars), text search, paginated load-more, smart polling (auto-refreshes every 5s while any asset is PROCESSING), multi-select mode with batch ZIP download, batch download banner (persisted in localStorage after upload), individual asset actions. Uses `fflate` for client-side ZIP creation. On mobile, tabs switch to a dropdown select. |
| `dashboard/assets/loading.tsx` | Skeleton loading screen for the assets list page. |
| `dashboard/assets/new/page.tsx` | New asset upload page (client component). Two-step wizard: (1) choose category, (2) select source and upload. Supports local file drag-and-drop and Google Drive Picker integration. Uploads files directly to ImageKit using per-file auth tokens, then POSTs the URLs to `/api/assets/upload`. Shows an upload progress dialog. Stores created asset IDs in localStorage as a "pending batch" for the batch download banner on the assets list page. Max 20 images per upload. |
| `dashboard/assets/new/loading.tsx` | Skeleton loading screen for the new asset page. |

---

### Components (`src/components/`)

| File | Purpose |
|---|---|
| `app-sidebar.tsx` | Main dashboard sidebar (client component). Renders the AirOne Studio branding, navigation links (Home, Gallery, Projects, Assets), a collapsible "Create" group with sub-items (New Project, New Asset), and a `UserButton` from Better Auth UI in the footer. Implements active route highlighting with path matching. Auto-closes on mobile after navigation. |
| `mobile-sidebar-wrapper.tsx` | Wrapper around `AppSidebar` that auto-closes the mobile sidebar on route changes by listening to `usePathname`. |
| `providers.tsx` | Client-side provider wrapper using `AuthUIProvider` from `@daveyplate/better-auth-ui`. Configures auth client, navigation callbacks, redirect-to (`/dashboard`), and session change handler that refreshes the router cache. |
| `sidebar1.tsx` | Alternate sidebar component (appears to be an earlier/template version from shadcn blocks). Not used in the active dashboard layout. Contains hardcoded placeholder data. |
| `theme-provider.tsx` | Thin wrapper around `next-themes`'s `ThemeProvider` for client-side theme toggling. |
| `sidebar/breadcrumb-page-client.tsx` | Dynamic breadcrumb component (client). Parses the current pathname into breadcrumb segments with human-readable labels (e.g., `/dashboard/assets/new` → Dashboard > Assets > New). Last segment is non-clickable. |
| `assets/asset-card.tsx` | Individual asset card component (memoized with `React.memo`). Displays the asset image (clean if available, original otherwise), category badge, processing/failed overlay, status indicators. Supports: inline rename, delete with confirmation, download, view in dialog, select mode with checkmark badge. Conditional UI based on asset status (PROCESSING shows spinner + blur, FAILED shows error icon + grayscale). |
| `assets/asset-upload-zone.tsx` | Dialog-based upload component (alternative to the dedicated new-asset page). Provides category selection, drag-and-drop zone, image previews with remove buttons, and upload to ImageKit + backend submission. Max 10 images. |

#### `components/ui/`

shadcn/ui primitives utilized in various parts of the application: `badge`, `breadcrumb`, `button`, `card`, `collapsible`, `dialog`, `dropdown-menu`, `input`, `label`, `mobile-sidebar-close`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `sonner`, `tabs`, `tooltip`.

---

### Hooks (`src/hooks/`)

| File | Purpose |
|---|---|
| `use-mobile.ts` | Mobile detection hook (used by the shadcn sidebar component). Uses `window.matchMedia` to detect viewport width < 768px. |
| `useIsMobile.ts` | Mobile detection hook (used by the assets client page). Includes SSR-safe hydration handling with a `hasMounted` flag. Listens to resize events. |

---

### Library (`src/lib/`)

| File | Purpose |
|---|---|
| `lib/auth-client.ts` | Creates and exports the Better Auth client instance for use in client components (via `createAuthClient()`). |
| `lib/auth.ts` | Standalone Better Auth instance with a direct `PrismaClient` (used by the catch-all API route at `api/auth/[...all]`). Configures email+password auth with PostgreSQL. |
| `lib/utils.ts` | Utility function `cn()` — merges Tailwind CSS classes using `clsx` and `tailwind-merge`. |

---

### Styles (`src/styles/`)

| File | Purpose |
|---|---|
| `styles/globals.css` | Global stylesheet. Imports Tailwind CSS v4, Better Auth UI styles, animation utilities, and shadcn base styles. Defines the full OKLCH colour-space design token system for both light and dark themes. Custom theme variables for sidebar colours. Utility classes: `.glass` (glassmorphic card), `.glass-hover`, `.animate-pulse-subtle`. Base layer sets Inter font with ligature features and text anti-aliasing. |
