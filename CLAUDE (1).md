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

## Go-live checklist — staging to production domain swap

The WordPress side (`forbrukenstg.wpenginepowered.com`, currently staging) is
referenced in a few places that live *outside* WP Engine's automatic
staging→production domain swap — a plugin file and a separate app's
database aren't touched by that process, so they have to be updated by
hand when the real production domain goes live. This is exactly the kind
of cross-system detail that's obvious mid-build and easy to forget weeks
later, so check every item below at go-live:

- [ ] `BV_OVERVIEW_URL` constant in `wp-content/mu-plugins/boligvelger.php` — a hardcoded PHP constant, not DB content, so WP Engine's staging-push search-and-replace will **not** catch it
- [ ] `BV_PROJECT_SLUG` in the same file — only needs changing if the *Supabase* project slug also changes for go-live (unrelated to the domain swap itself, but easy to conflate — check it while you're in the file)
- [ ] App Settings panel → **Detail page URL**, per project using this feature (`project.cta_config.detail_page_url`) — lives in Supabase, entirely outside WordPress's domain-swap process
- [ ] App Settings panel → **Overview page URL**, per project using this feature (`project.cta_config.overview_url`) — same as above
- [ ] RankMath canonical / site URL settings in WP admin, if anything there is staging-specific rather than using `home_url()` dynamically
- [ ] Re-test the full click flow end to end on the new domain: overview widget → click apartment → standalone page → CTA → back-to-overview button
- [ ] View Page Source on a real unit URL on the new domain and confirm `<title>`, `og:*`, and canonical tags all reflect the new domain, not the staging one
- [ ] Share a test link on the new domain (WhatsApp/iMessage/Slack) to confirm the link preview actually pulls the new metadata — social platforms cache OG previews per-URL, so a *new* domain gets a fresh preview but is worth confirming once

Separate but related: if the **Next.js app itself** ever moves off
`boligvelger-juni.vercel.app` onto a custom domain, that's a different swap —
update `NEXT_PUBLIC_APP_URL` in Vercel env vars, redeploy, and re-verify
canonical/OG URLs there too. Also update `BV_APP_URL` in the mu-plugin and
the `src` in any raw `embed.js` script tags pasted into Bricks Code
elements, since those point at the app's domain, not WordPress's.

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

---

### Session 4 complete (2026-06-29) — Week 3 public embed

#### What was built

- **`lib/useActiveView.ts`** — moved here from `app/editor/[projectId]/hooks/useActiveView.ts`; editor's hook file now re-exports from lib so all existing imports continue to work. This is the shared abstraction seam for both the editor and embed.
- **`app/globals.css`** — added `.bv-root` (container-type: inline-size), `.bv-layout`, `.bv-col-canvas`, `.bv-col-cards` with `@container` rules: desktop ≥768px → 60/40 side-by-side, mobile stacked. No viewport media queries.
- **`app/embed/[slug]/page.tsx`** — server component, `revalidate = 60`. Fetches project + apartments via service-role client, passes to WidgetClient. `notFound()` on missing slug.
- **`app/embed/[slug]/PolygonOverlay.tsx`** — single dispatch point for all SVG polygon output. Takes `{ unitId, points, status }` via apartment + project; applies fill/stroke/clickability from `project.statuses`. Hover: brightness filter + thicker stroke. Non-clickable: `pointer-events: none`.
- **`app/embed/[slug]/ImageCanvas.tsx`** — wraps view image in a `position: relative` div, overlays SVG with `viewBox="0 0 {image_width} {image_height}" preserveAspectRatio="xMidYMid meet"`. All image URL access via `activeViewHook.activeView`.
- **`app/embed/[slug]/ViewSwitcher.tsx`** — pill-style toggle; hidden when only one view. Labels via `resolveLabel`. Thumbnails from `view.thumbnail_url`.
- **`app/embed/[slug]/FilterBar.tsx`** — exports `FilterRule` type and `buildStatusRules()` factory. Rule-based: `predicate: (apt) => boolean`. Chips from `project.statuses` where `show_in_filter: true`. "All" chip always first.
- **`app/embed/[slug]/Card.tsx`** — renders one apartment card with visible fields from `project.visible_fields`, labels from `project.labels`. Shows "switch view" hint if apartment has no polygon in current view. Hover/select state via className.
- **`app/embed/[slug]/CardList.tsx`** — applies active filter predicate, renders `<Card>` list. Shows `no_apartments_match` label when empty.
- **`app/embed/[slug]/ImageGallery.tsx`** — main image + thumbnail row. Left/right arrow keyboard navigation. Handles `caption` overlay.
- **`app/embed/[slug]/DetailModal.tsx`** — fixed overlay with backdrop-click-to-close and Escape key. Shows ImageGallery (if `gallery_config.show_in_modal`), field grid, description, upcoming viewing section (if `viewing_date` in future), CTA button. CTA supports `link`, `email`, `phone` types. Fires `apartment_view` and `cta_click` analytics events.
- **`app/embed/[slug]/PromoPopup.tsx`** — appears after `popup_config.delay_ms`. Checks `sessionStorage` key `bv:popup_seen:{slug}` to show once per session. Viewing-aware: uses `when_viewing_scheduled` if any apartment has future `viewing_date`, else `when_no_viewing`. Fires `popup_shown`, `popup_dismissed`, `popup_cta_click` events.
- **`app/embed/[slug]/WidgetClient.tsx`** — top-level client component. Owns: `hoveredUnitId`, `selectedUnitId`, `activeRuleId`. Uses `useActiveView`. Syncs active view to `?view=` URL param. Posts `bv:resize` messages to parent for iframe height. Fires `widget_load` on mount, `view_switch` on view change, `filter_change` on filter change.
- **`public/embed.js`** — customer-paste script. Reads `data-project`, `data-target`, `data-height`, `data-radius`. Creates iframe at `/embed/{slug}`. Listens for `bv:resize` messages to update iframe height. Forwards `bv:analytics` events to parent-page GA4/Meta Pixel.

#### Hard constraints — session 4 audit

- All user-facing strings via `resolveLabel()` — verified
- All polygon SVG through `<PolygonOverlay>` — verified
- All image URL access via `useActiveView()` abstraction seam — verified
- All analytics via `analytics.track()` — verified
- Container queries only, no viewport media queries — verified
- `revalidate = 60` on `/embed/[slug]/page.tsx` — verified
- No `localStorage`; sessionStorage used only for popup-dismissed flag — verified
- Zero TypeScript errors — `npx tsc --noEmit` passes clean

---

---

### Session 5 complete (2026-06-29) — embed polish + add apartment UI

#### What was built

- **Card highlight on polygon hover** (`app/embed/[slug]/WidgetClient.tsx`, `CardList.tsx`, `Card.tsx`):
  - Added `polygonHoveredUnitId` state separate from `hoveredUnitId`
  - `handlePolygonHover` sets both; `handleCardHover` sets only `hoveredUnitId` (clears polygon source)
  - `isPolygonHovered` prop flows to `Card` — adds `outline outline-2 outline-black` and `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` via `useEffect`
  - Result: hovering a polygon outlines the card AND scrolls it into view; hovering a card does not trigger outline/scroll

- **Add apartment UI** (`lib/actions.ts`, `lib/editor-strings.ts`, `EditorShell.tsx`, `EditorSidebar.tsx`):
  - `createApartment(projectId, unitId, title, status, displayOrder)` server action — inserts row with `polygons: {}`, `images: []`
  - `+ Add apartment` button in sidebar list-view header toggles inline form
  - Form fields: Unit ID (required, `type="text"`), Title (optional), Status (select from `project.statuses`)
  - On success: `onApartmentCreated` callback adds apartment to EditorShell state and auto-selects it
  - Disabled Add button shows grey (`disabled:bg-zinc-300`) not transparent so it's always visible
  - Duplicate unit_id shows inline error "Failed — unit ID may already exist"

#### Decisions
- Unit ID is free text — no enforced naming convention. Must be unique per project.
- `display_order` defaults to `apartments.length + 1` on creation.

---

---

### Session 6 complete (2026-06-30) — editor tools + sticky CTA

#### What was built

- **Delete apartment** (`lib/actions.ts`, `EditorSidebar.tsx`, `EditorShell.tsx`):
  - `deleteApartment(id)` server action
  - Small red "Delete" link in apartment header → inline confirmation on white background with red "Yes, delete" button
  - On confirm: apartment removed from state, sidebar returns to list view

- **Project Settings UI** (`lib/actions.ts`, `app/editor/[projectId]/EditorSettings.tsx`, `EditorShell.tsx`):
  - `saveProjectConfig(id, patch)` server action — patches `visible_fields`, `labels`, `cta_config`, `popup_config`
  - "Settings" toggle button in editor header; when active, replaces canvas+sidebar with settings panel
  - Settings panel sections: visible fields (checkboxes), status labels (text inputs), CTA (type/url/label), popup (enable/delay/cta url)
  - Single "Save settings" blue button at bottom; shows "Saved ✓" or "Save failed" inline
  - `EditorShell` now holds `currentProject` in state so settings saves reflect immediately without page reload
  - `effectiveProject = { ...currentProject, views }` merges mutable project config with views state

- **Sticky CTA button** (`app/embed/[slug]/WidgetClient.tsx`, `PromoPopup.tsx`, `lib/config-defaults.ts`):
  - Blue pill button fixed bottom-right of embed — always visible, triggers popup on click
  - `popupKey` state: incrementing it remounts `<PromoPopup key={popupKey}>` to force reshow
  - `noDelay` prop on PromoPopup: skips `delay_ms` and sessionStorage check on manual trigger
  - Button and PromoPopup moved outside `bv-root` div — `container-type: inline-size` on bv-root was breaking `position: fixed`
  - Label configurable via `sticky_cta_label` in `DEFAULT_LABELS` (default: "Interessert?"), editable through Settings

#### Decisions
- Popup retrigger uses `key` remount pattern (clean) rather than lifting `visible` state or adding imperative refs
- Settings panel does NOT auto-save — single Save button for atomic commit of all changes
- Delete requires explicit confirmation step to prevent accidental data loss

---

### Session 6.5 (2026-06-30 → 2026-07-01) — Norwegian fields + mobile polish

Two small commits landed after the Session 6 notes were written and were never logged. Recording them here for the record:

- **`66f0d6a`** — Norwegian real estate fields (`collective_debt`, `property_type`, `completion_year`, `bra`, `primary_room`) added to `apartments` (migration `0005_add_apartment_fields.sql`), plus field labels became editable in the Settings panel (closing the "Field labels in Settings panel" item from the old "What's next" list).
- **`fe533c5`** — mobile polish: `DetailModal` and `PromoPopup` became bottom sheets on mobile / centered panels on desktop, larger touch targets on the close button and filter chips (closing the old "Mobile edge cases" item).

---

### Session 7 (2026-07-21) — standalone single-apartment page + configurable navigation

#### What was built

- **`app/embed/[slug]/ApartmentDetailContent.tsx`** — new shared presentational component holding the apartment detail content (gallery, title/status, field grid, description, upcoming-viewing block, CTA button + `handleCta`). Extracted from `DetailModal.tsx` so both the modal and the new standalone page render identical content from one source. `onClose` is optional — the Escape-key listener only attaches when it's provided. `apartment_view` fires from this component's mount effect, so it fires correctly whether the content is mounted inside the modal or directly on the standalone page — no separate click-time tracking needed.
- **`app/embed/[slug]/DetailModal.tsx`** — reduced to backdrop + panel chrome (close button, bottom-sheet/centered-modal shell) wrapping `<ApartmentDetailContent>`. Behavior unchanged.
- **`app/embed/[slug]/[unitId]/page.tsx`** — new standalone unit route. Server component, `revalidate = 60`, matching the rest of the embed's ISR pattern. Fetches `project` by slug and the single `apartment` by `project_id` + `unit_id` directly via the service-role `db` client (same pattern as `/embed/[slug]/page.tsx`), wrapped in React's `cache()` so `generateMetadata` and the page body share one DB round trip per request. `notFound()` if either is missing. Renders only `<ApartmentDetailContent>` — no `WidgetClient` chrome (no canvas, card list, filter bar, or popup).
- **`generateMetadata`** on the same route — per-unit `<title>`, meta description (apartment description, falling back to price/size, falling back to project name), Open Graph tags (`og:title`, `og:description`, `og:image` from the first sorted apartment image), and a canonical URL built from `NEXT_PUBLIC_APP_URL`.
- **`app/embed/[slug]/[unitId]/EmbedResizeSync.tsx`** — small client component mirroring the `bv:resize` `postMessage` + `ResizeObserver` effect `WidgetClient` already does for the main embed, so `embed.js` can size a WordPress iframe pointed at this standalone page correctly. `WidgetClient.tsx` itself was not touched.
- **`lib/types.ts`** — added `detail_page_url?: string` to `CtaConfig`: a per-project URL template (e.g. `https://example.com/apartment/?unit={unitId}`) for navigating to an external standalone page instead of opening `DetailModal`. Left out of `config-defaults.ts` intentionally — unset by default so no existing project's behavior changes.
- **`app/embed/[slug]/WidgetClient.tsx`** — `handleSelect` (the single choke point for both card clicks and polygon clicks) now checks `project.cta_config.detail_page_url` first: if set, substitutes `{unitId}` and navigates the top-level browser via `window.top.location.href` (breaks out of a WordPress iframe correctly); if unset, falls through to the existing `setSelectedUnitId` modal-open behavior unchanged.

#### Decisions

- The spec (`SPEC.md` "Deep linking") originally defined `/embed/[slug]/[unitId]` as "loads widget with modal pre-opened" — that behavior was never actually built. This session repurposes the same URL to mean the standalone chrome-less page instead, since that's what the actual use case (a link that shows *only* one apartment, matching how Finn.no ad pages work) needs. `SPEC.md` line 650 is now stale and should be corrected to match if anyone reads it as ground truth.
- `detail_page_url` navigation lives in `WidgetClient.handleSelect`, not `Card.tsx`, so both card clicks and canvas polygon clicks get the same behavior from one place.
- Work done on `feature/single-apartment-page` branch, not directly on `main`.

#### Hard constraints — session 7 audit

- No `any` — `npx tsc --noEmit` and `npm run build` both pass clean
- No hardcoded strings — no new user-facing strings were added; existing `resolveLabel()` calls carried over unchanged in the extracted component
- No hardcoded customer domain/URL — `detail_page_url` only ever comes from `project.cta_config`, never inlined in component code
- `SUPABASE_SERVICE_ROLE_KEY` server-only — only used via `lib/db.ts`'s `db` client in the new route's server-side `getData()`
- Verified against live data: `/embed/test-project/unit1` returns 200 with correct per-unit metadata and zero widget chrome; `/embed/test-project/does-not-exist` returns 404; `/embed/test-project` (main widget) unaffected; live `test-project.cta_config` has no `detail_page_url` set, confirming the modal path is untouched for existing projects

### What's next

**Blocking Phase 2 (WordPress side) — do once Phase 1 above is merged and deployed:**
- Build the WordPress `/apartment/?unit=X` template that iframes `/embed/[slug]/[unitId]`, with server-side (PHP) per-unit `<title>`/meta/OG tags pulled from `/api/public/[slug]`
- Only then set `detail_page_url` in the real project's `cta_config` — that's the switch that flips card/polygon clicks from modal to WordPress navigation, and should happen last, after both pages are confirmed working independently

**Waiting on real content (do when ready):**
- Run `npx supabase db push` — confirm `0005_add_apartment_fields.sql` is applied on the remote project
- Test embed with real data on WordPress

**Remaining polish (can do any time):**
- Image optimization — switch `<img>` to Next.js `<Image>` with Supabase image transforms for thumbnails
- Dedicated `/api/public/[slug]/[unitId]` endpoint (nice-to-have; the WordPress PHP side can filter the existing `/api/public/[slug]` response client-side instead)

<!-- Update this section after each work session so future Claude sessions know exactly where things stand. -->