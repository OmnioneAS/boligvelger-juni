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

### Session 1 complete (2026-06-26) — Week 1 foundation

#### What was built

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

#### Hard constraints enforced in session 1

All constraints from CLAUDE.md were upheld: no `any`, no hardcoded strings (labels always through `resolveLabel()`), image URLs always through `useActiveView()`, `SUPABASE_SERVICE_ROLE_KEY` server-only, no `localStorage`, container queries deferred to embed (Week 3).

---

### Session 2 complete (2026-06-26) — Week 1 fully done

#### What was built

- **`middleware.ts`** — enforces `EDITOR_SHARED_SECRET` on all `/editor/*` routes. First visit with `?key=<secret>` sets an `httpOnly` `editor_auth` cookie (8 h, SameSite: strict, secure in production) and redirects to the clean URL. Subsequent visits use the cookie. Wrong or missing key → 404.
- **`lib/editor-strings.ts`** — `EDITOR_INTERNAL_STRINGS` constant; all editor-chrome strings that are not in `project.labels` live here (field labels for `title`, `unit_id`, `viewing_date`, `viewing_note`; save-indicator text: `Saving…`, `Saved ✓`, `Save failed`; section headers; empty states; uploader strings). Nothing scattered inline in components.
- **`lib/auth.ts`** — updated: `EDITOR_AUTH_COOKIE` constant exported; `requireEditorAuth()` now accepts either the `x-editor-secret` header (server-to-server) or the `editor_auth` cookie (browser calls from `/editor/*` pages).
- **`lib/actions.ts`** — `'use server'` Server Actions: `saveApartmentFields(id, patch)` and `saveProjectViews(id, views)`. Both use the service-role DB client directly; no auth header needed. `ApartmentPatch` type allows `null` for optional string columns so they can be explicitly cleared to NULL in Postgres.
- **`supabase/migrations/0003_storage_bucket.sql`** — creates the `view-images` Storage bucket (public) with an anon read policy. Writes go through the service-role API route only.
- **`app/api/storage/upload-view-image/route.ts`** — `POST` accepts `FormData { file, projectId, viewKey }`, uploads to `view-images/{projectId}/{viewKey}/image.{ext}` with `upsert: true`, returns `{ url: string }`. Protected by `requireEditorAuth` (cookie or header).
- **`app/editor/[projectId]/EditorSidebar.tsx`** — apartment field form. All field labels from `resolveLabel(project.labels, 'field_*')` or `EDITOR_INTERNAL_STRINGS` (for `title`, `unit_id`, `viewing_date`, `viewing_note`). Status `<select>` data-driven from `project.statuses` with optimistic local state. Auto-save on blur via `saveApartmentFields`; "Saved ✓" flash (2 s) from `EDITOR_INTERNAL_STRINGS`. Fields absent from `project.visible_fields` show a "hidden in embed" badge. Polygon-status section shows per-view drawn/not-drawn + vertex count. Images section (read-only list in Week 1).
- **`app/editor/[projectId]/EditorImageUploader.tsx`** — view image upload. Reads current view exclusively via `activeViewHook.activeView` (abstraction seam upheld). On file pick: measures dimensions via browser `Image` API → POSTs to `/api/storage/upload-view-image` → calls `saveProjectViews` Server Action → calls `onViewsUpdated` so shell re-renders canvas with new image and dimensions. Spinner during upload.
- **`app/editor/[projectId]/EditorCanvas.tsx`** — polygon click-to-select added. When not drawing: clicking a closed polygon calls `onSelectUnit(unitId)` and stops propagation. Selected polygon rendered with stronger fill + thicker stroke. New props: `selectedUnitId`, `onSelectUnit`.
- **`app/editor/[projectId]/EditorShell.tsx`** — major update. `views` and `apartments` lifted to React state (updated by sidebar saves and image uploads so canvas re-renders without a page reload). `selectedUnitId` state drives the sidebar. Layout changed to: toolbar row (view switcher + image uploader) above a two-pane main area (canvas `flex-1`, sidebar `w-80`).

#### Hard constraints — session 2 audit

- No `any` — verified by `npx tsc --noEmit` (zero errors)
- No hardcoded customer strings — field labels via `resolveLabel()`; all admin strings via `EDITOR_INTERNAL_STRINGS`
- Status colors from `status.color`, never hardcoded hex
- Image URL access via `useActiveView()` only — `EditorImageUploader` reads `activeViewHook.activeView` exclusively
- `SUPABASE_SERVICE_ROLE_KEY` server-only — used in `lib/actions.ts` (Server Action) and `/api/storage/…/route.ts` only
- Analytics via `analytics.track()` — no analytics events in session 2 (none specified for editor features)
- No `localStorage` — not touched

---

---

### Session 3 complete (2026-06-29) — Week 2 editor completion

#### What was built

- **`app/editor/[projectId]/hooks/useHistory.ts`** — generic undo-only history hook. Uses a `useRef` for synchronous stack access + one `useState` boolean for reactive `canUndo`. Call `push(snapshot)` before each commit, `pop()` on Ctrl+Z, `clear()` on view switch.
- **`app/editor/[projectId]/hooks/useSnap.ts`** — two pure utilities: `snapToNearby(x, y, allPointLists, excludePoint?)` snaps to the nearest existing vertex within 10 image-px; `distToSegment(px, py, ax, ay, bx, by)` returns perpendicular distance + parameter `t` used for edge-click vertex insertion.
- **`app/editor/[projectId]/EditorCanvas.tsx`** — complete rewrite. New features:
  - **Polygon save pipeline**: new `onPolygonSaved(unitId, points | null)` prop; every commit (draw, drag, insert, delete, undo) calls it so EditorShell persists to DB
  - **Drawing gated on selected apartment**: must select an apartment before the canvas accepts clicks to draw; empty-space click starts drawing; Escape cancels
  - **Vertex drag**: closed-polygon vertex circles are `draggable`; snap to nearest vertex on drag-end; commits + saves
  - **Edge-click to insert vertex**: clicking an already-selected polygon's edge (within 8 image-px) inserts a vertex at the click point; commits + saves
  - **Delete vertex**: `Delete`/`Backspace` removes the selected vertex; minimum 3 vertices enforced
  - **Point snapping**: all vertex placements (during drawing, drag-end, edge-insert) snap to nearest existing vertex within 10 image-px
  - **Zoom**: `Ctrl+scroll` (or `Cmd+scroll` on Mac); centers on cursor; range 0.3×–10×
  - **Pan**: `Space+drag`; grab/grabbing cursor feedback; stable across zoom
  - **Undo** (`Ctrl+Z` / `Cmd+Z`): pops history stack, restores previous polygon state, fires `onPolygonSaved` to persist the reverted state; clears on view switch
  - **Keyboard**: `Enter` closes draft polygon; `Esc` cancels draft → deselects polygon → deselects apartment (cascade); all keyboard handlers skip form inputs
  - **Status bar**: context-aware hints (drawing / apartment selected / no selection); shows "Ctrl+Z undo" when stack is non-empty
  - **Stable refs pattern**: all state used inside keyboard `useEffect` is mirrored to refs to avoid stale closures; re-seed effect depends only on `activeView` (apartments excluded intentionally — canvas is source of truth during editing)
- **`app/editor/[projectId]/EditorShell.tsx`** — `handlePolygonSaved` added: finds apartment by `unitId`, merges or deletes the view's polygon key, calls `saveApartmentFields`, updates `apartments` state on success. Passed as `onPolygonSaved` prop to EditorCanvas.
- **`supabase/migrations/0004_apartment_images_bucket.sql`** — creates `apartment-images` Storage bucket (public) with anon read policy.
- **`app/api/storage/upload-apartment-image/route.ts`** — `POST` accepts `FormData { file, apartmentId, filename }`, uploads to `apartment-images/{apartmentId}/{filename}`, returns `{ url }`. Protected by `requireEditorAuth`.
- **`lib/editor-strings.ts`** — added `apt_image_add`, `apt_image_delete`, `apt_image_uploading`, `apt_image_upload_error`, `apt_image_type_label`, `apt_image_alt_label`, `apt_image_alt_placeholder`.
- **`app/editor/[projectId]/EditorSidebar.tsx`** — replaced read-only images list with `ApartmentImages` sub-component: file input uploads to `/api/storage/upload-apartment-image`, adds image to `apartment.images[]`, saves via `saveApartmentFields`; shows thumbnail, type select (`render`/`floorplan`/`photo`), alt text input (auto-saves on change), delete button. Images sync when selected apartment changes.

#### Hard constraints — session 3 audit

- No `any` — `npx tsc --noEmit` passes with zero errors
- No hardcoded strings — all new UI strings in `EDITOR_INTERNAL_STRINGS`
- `SUPABASE_SERVICE_ROLE_KEY` server-only — only in `lib/actions.ts` and API routes
- No redo — intentionally omitted per spec
- Abstraction seams upheld — image URLs via `useActiveView()`, no direct `gtag`/`fbq`, no `localStorage`

---

### What's next (Week 3)

1. **Run migration**: `npx supabase db push` to create the `apartment-images` bucket (migration `0004`)
2. **Public embed** (`/embed/[slug]`):
   - `app/embed/[slug]/page.tsx` with `revalidate = 60`
   - `WidgetClient.tsx` — top-level client component
   - `ImageCanvas.tsx` — view image + SVG polygon overlay using `useActiveView()`
   - `PolygonOverlay.tsx` — data-driven SVG (status color/stroke from `project.statuses`)
   - `ViewSwitcher.tsx` — public pill toggle
   - `CardList.tsx` + `Card.tsx` — reads `visible_fields` + `labels`
   - `FilterBar.tsx` — from `statuses` with rule-based architecture
   - `DetailModal.tsx` + `ImageGallery.tsx` — apartment images, CTA, viewing section
   - `ViewingBadge.tsx`, `PromoPopup.tsx`
3. **Bidirectional hover** — polygon ↔ card cross-highlight via `unitId`
4. **Container-query responsive layout** — desktop 60/40 split, mobile stacked
5. **`embed.js`** — customer-facing script: creates iframe, postMessage height
6. **Analytics** — `lib/analytics.ts` wired through `WidgetClient`

<!-- Update this section after each work session so future Claude sessions know exactly where things stand. -->