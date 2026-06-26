# Boligvelger Widget

An embeddable apartment selector for Norwegian property developers. Customers paste a single iframe snippet into their WordPress (or any) site; visitors see a building image with clickable polygon overlays and a side card list of apartments. See `SPEC.md` for the full product spec.

## Stack

- **Framework:** Next.js (App Router) on Vercel
- **Language:** TypeScript, strict mode, no `any`
- **Styling:** Tailwind CSS + CSS custom properties (custom props are the styling API for the embed)
- **Database:** Postgres via Supabase, including Storage for images
- **Canvas:** react-konva for the polygon editor
- **Animation:** CSS transitions for hover; Framer Motion or CSS for modals and view transitions
- **Auth (v1):** shared-secret env-var check on the editor routes. No customer-facing auth in v1.

## The one rule that matters most

**Everything client-visible is data-driven.** No hardcoded strings, colors, statuses, fields, CTAs, or view definitions in component code. They all come from the project's config objects (`labels`, `statuses`, `cta_config`, `visible_fields`, `views`, etc.).

If you're about to write a string, color, or option that varies per customer, stop and put it in the project config instead. This is non-negotiable — it's the difference between a widget that scales to 50 customers and one that needs a rewrite for the third.

## Abstraction seams (do not bypass)

These are the parts most likely to evolve in v2+. Feature code goes through them, never around them:

- **Image / view access:** all reads go through the `useActiveView()` hook and `<ImageCanvas>` component. Never read `project.views[i].image_url` directly from feature code.
- **Polygon rendering:** all SVG polygon output goes through `<PolygonOverlay>`. Feature code passes `{ unitId, points, status }` lists; it never builds SVG inline.
- **Analytics:** all event tracking goes through `analytics.track()` in `lib/analytics.ts`. Never call `gtag`, `fbq`, or other vendor APIs directly from components.

## Conventions

- **Server components by default.** `"use client"` only when needed (event handlers, hooks, canvas, browser APIs).
- **File naming:** kebab-case for files and folders, PascalCase for React components, camelCase for functions and variables.
- **Imports:** absolute paths via the `@/*` alias (configured in `tsconfig.json`).
- **Styling:** Tailwind utility classes inline. The embed's themable properties live in CSS custom properties (`--bv-primary`, `--bv-status-available`, etc.) set on the embed root.
- **Responsive layout: container queries, not viewport media queries.** The embed lives in an iframe of unknown width.
- **Errors:** prefer `error.tsx` and `not-found.tsx` boundaries; throw from server code.
- **Config parsing:** strictly typed in `lib/types.ts` and validated when read from the DB. Fall back gracefully on missing or invalid config (English fallback for missing labels, "unknown" for invalid status refs, placeholder for missing images).

## Coordinate system (polygon storage)

Polygon points are stored in **image-space** coordinates: `0` to `image_width` and `0` to `image_height` for that view. NOT normalized 0–1. NOT screen pixels.

The embed renders polygons inside an SVG with `viewBox="0 0 {image_width} {image_height}"` and `preserveAspectRatio="xMidYMid meet"`, so polygons match the image at any display size.

Each apartment can have a polygon per view (front, back, etc.). If an apartment isn't visible from a view, that view's key is simply absent from the apartment's `polygons` object.

## Data model

See `SPEC.md` section "Data model" for the canonical schema. Key points for code:

- `projects.views`, `projects.labels`, `projects.statuses`, `projects.cta_config`, etc. are JSONB. Type them strictly in `lib/types.ts`.
- `apartments.polygons` is a map of `view_key → [[x, y], ...]` in image-space coords.
- `apartments.images` is an array of image objects.
- `display_order` controls card sorting.

## Caching

- Public embed routes (`/embed/[slug]` and `/embed/[slug]/[unitId]`) use ISR: `export const revalidate = 60`.
- Editor routes are dynamic — never cache.
- Admin mutations don't need explicit cache busting in v1; the 60-second revalidate is acceptable. (v2: switch to tag-based revalidation per project.)

## Defaults and new projects

New projects are seeded from `lib/config-defaults.ts` with sensible Norwegian defaults: Norwegian labels, three statuses (Ledig / Reservert / Solgt), link-type CTA, 5-second popup delay, the standard visible-field set. The developer never writes JSON from scratch.

## Environment variables

Required in `.env.local` and in Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, never `NEXT_PUBLIC_`
- `EDITOR_SHARED_SECRET` — protects `/editor/*` routes in v1
- `NEXT_PUBLIC_APP_URL` — used to build canonical embed URLs

## Commands

- `npm run dev` — local dev on http://localhost:3000
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx supabase start` — local Supabase stack (requires Docker)
- `npx supabase db push` — push migrations to the remote project

## Things to never do

- **Never hardcode client-visible strings, colors, statuses, fields, or CTAs** — they go in config objects, always.
- **Never read `project.views[i].image_url` directly** — go through `useActiveView()`.
- **Never build polygon SVG inline** — render through `<PolygonOverlay>`.
- **Never call `gtag` / `fbq` directly** — dispatch through `analytics.track()`.
- **Never use `localStorage`.** sessionStorage only for the popup-dismissed flag. Everything else persists in Postgres.
- **Never use viewport media queries for the embed.** Container queries only.
- **Never put `SUPABASE_SERVICE_ROLE_KEY` in a client component** or any `NEXT_PUBLIC_*` variable.
- **Never use `any` in TypeScript.** Strict mode is on for a reason.
- **Never add angle snapping or redo to the editor in v1.** Point snapping and undo are deliberately sufficient.
- **Never commit secrets.** `.env.local` locally, Vercel env vars in production.

## Current state

**Session 1 complete (2026-06-26) — Week 1 foundation done.**

### What was built

- **Next.js 16 scaffold** (App Router, TypeScript strict, Tailwind, `@/*` alias)
- **Supabase schema** — `supabase/migrations/0001_initial_schema.sql`: `projects` and `apartments` tables with all JSONB config columns, `updated_at` triggers, RLS (anon read, service-role write)
- **Seed** — `supabase/migrations/0002_seed_test_project.sql`: test project at fixed UUID `00000000-0000-0000-0000-000000000001`, one view pointing at `picsum.photos/id/1074/2400/1600` (2400×1600), two seed apartments. Navigate to `/editor/00000000-0000-0000-0000-000000000001` after running migrations.
- **`lib/types.ts`** — strict types for all config objects (no `any`): `ViewDefinition`, `Labels`, `StatusDefinition`, `CtaConfig`, `PopupConfig`, `GalleryConfig`, `AnalyticsConfig`, `ProjectConfig`, `PolygonPoints`, `Polygons`, `ApartmentImage`, `Project`, `Apartment`
- **`lib/config-defaults.ts`** — full Norwegian defaults (Ledig/Reservert/Solgt, all 30+ label keys, link CTA, 5 s popup), `buildDefaultProject()` factory, `resolveLabel()` with English fallbacks
- **`lib/db.ts`** — server-only Supabase client (service role) + public anon client
- **`lib/auth.ts`** — `requireEditorAuth()` (X-Editor-Secret header check) + `getEditorSecretHeader()`
- **`lib/analytics.ts`** — `track()` dispatch stub (gtag + fbq + postMessage); no vendor calls from components
- **`app/editor/[projectId]/hooks/useActiveView.ts`** — shared hook; returns `{ activeView, activeViewKey, setActiveViewKey }`; initialises to `is_default` view; abstraction seam for all image URL access
- **`app/editor/[projectId]/EditorViewSwitcher.tsx`** — pill-style view selector, thumbnails via Next.js Image, reads labels through `resolveLabel()`
- **`app/editor/[projectId]/EditorCanvas.tsx`** — react-konva canvas; scale = `containerWidth / image_width` so Konva coords = image coords; click to add vertices; snap-close ring on first vertex when ≥3 pts; double-click or Enter closes polygon; Escape cancels draft; seeds existing apartment polygons from DB on view change
- **`app/editor/[projectId]/EditorShell.tsx`** — client wrapper that owns `useActiveView` state and composes switcher + canvas + apartment list
- **`app/editor/[projectId]/page.tsx`** — server component; awaits `params` (Next.js 16 async params); fetches project + apartments via service-role client; `notFound()` on missing project; `force-dynamic`
- **API routes** — `GET/PUT/POST /api/projects/[id]`, `GET/POST/PUT/DELETE /api/apartments/[id]`, `GET /api/public/[slug]` (stub with cache headers)
- **`next.config.ts`** — `images.remotePatterns` for Supabase Storage, picsum.photos, Unsplash
- **`.env.local.example`** — all five required env vars documented

### What's next (remaining Week 1 + Week 2)

1. **Fill in `.env.local`** with real Supabase credentials and run `npx supabase db push` to deploy migrations
2. Confirm `/editor/00000000-0000-0000-0000-000000000001` loads and polygon drawing works
3. **EditorSidebar** — apartment field form (all fields + viewing_date + images list), auto-save on blur
4. **EditorImageUploader** — upload view image to Supabase Storage, capture dimensions, write back to `project.views`
5. **ProjectSettings** — raw JSON editor for project-level config (v1)
6. **Week 2**: vertex dragging, edge-click insert, delete vertex, point snapping, zoom/pan, undo, apartment image upload

### Hard constraints enforced in session 1

All constraints from CLAUDE.md were upheld: no `any`, no hardcoded strings (labels always through `resolveLabel()`), image URLs always through `useActiveView()`, `SUPABASE_SERVICE_ROLE_KEY` server-only, no `localStorage`, container queries deferred to embed (Week 3).

<!-- Update this section after each work session so future Claude sessions know exactly where things stand. -->
