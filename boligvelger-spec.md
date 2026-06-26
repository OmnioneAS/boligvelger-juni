# Boligvelger Widget — Project Specification

## Overview

A reusable, embeddable "apartment selector" (boligvelger) widget for property
developers. Customers embed it in their WordPress sites via an iframe. The
widget shows one or more building/floor-plan images (e.g. 3D renders of front
and back), each with clickable polygon overlays representing apartments
("flats"). A card list shows apartment information alongside the image.
Hovering and clicking are bidirectional between image and cards. Clicking
opens a detail view with apartment images, full info, and a configurable CTA.
A promo popup appears after a configurable delay, surfacing upcoming viewings
when scheduled.

This document is the source-of-truth spec for v1.

---

## Core architectural principle

**Everything client-visible is data-driven, even when the data is set manually
in v1.**

This is the single most important rule for the codebase. It means:

- All visible strings come from a `labels` object, not hardcoded JSX.
- All colors come from CSS custom properties, not hardcoded hex codes.
- All field visibility comes from a `visible_fields` array per project.
- All CTAs come from a `cta` config object, not hardcoded buttons.
- All status options come from a `statuses` config, not hardcoded enums.
- All views (building angles) come from a `views` array per project.
- All apartment images come from an `images` array per apartment.

In v1, the developer populates these via direct database access or a minimal
internal tool. In v2+, settings UIs are added on top of the same data — no
refactoring required. The code is built for configuration from day one; only
the editing UI is deferred.

**Claude Code: enforce this rule on every component. If you find yourself
writing a hardcoded string, color, or option that varies per client, stop and
put it in the project config instead.**

### Secondary principle: isolate volatile parts

These parts of the system are likely to evolve significantly in v2+ and
should be wrapped in clear abstractions so future changes are localized:

- **Image rendering and view selection.** All image access must go through a
  single `useActiveView()` hook and an `<ImageCanvas>` component. No direct
  reads of `project.views[i].image_url` from feature code. When v2 expands
  view capabilities (transitions, viewpoint-specific UI, 3D), only these
  abstractions change.
- **Polygon rendering.** All polygon SVG output goes through a single
  `<PolygonOverlay>` component that takes a list of `{ unitId, points,
  status }`. Feature code never builds SVG directly.
- **Analytics dispatch.** All event firing goes through `analytics.track()`.
  Components never call `gtag` or `fbq` directly.

These are the "expansion seams" of the codebase.

---

## Goals and constraints

- **Embeddable in WordPress** via a single script snippet. Customer pastes
  one block of HTML/JS. No WordPress plugin required in v1.
- **Styleable from the customer's WordPress site** via CSS custom properties
  passed as data attributes on the embed script.
- **Mobile responsive** using container queries (not viewport media queries),
  because the embed lives inside an iframe of unknown width.
- **Built for future iteration.** Clean separation between data, rendering,
  and interaction layers. New features add to the config, not the codebase.
- **v1 admin: developer-managed.** No customer-facing admin UI. The developer
  enters data via an internal editor at `/editor/[projectId]` protected by a
  shared secret.
- **Analytics: outsourced.** No custom analytics dashboard. Events fire to
  the customer's existing analytics (GA4, Meta Pixel, GHL).

---

## Tech stack

- **Framework:** Next.js (App Router) deployed on Vercel
- **Language:** TypeScript
- **Database:** Postgres via Supabase (also used for image storage)
- **Canvas library:** `react-konva` for the polygon editor
- **Styling:** Tailwind CSS + CSS custom properties for the embed
- **Animation:** CSS transitions for hover; Framer Motion (or CSS) for modal
  and view-switching transitions
- **Auth (editor only):** Shared-secret check via env var in v1

---

## Data model

```
projects
  id                  uuid (PK)
  slug                text (unique, used in URLs)
  name                text
  views               jsonb     -- array of view definitions, see below
  config              jsonb     -- general project config
  labels              jsonb     -- all client-facing strings
  visible_fields      jsonb     -- array of field keys to display in cards/modal
  statuses            jsonb     -- array of status definitions
  cta_config          jsonb     -- default CTA behavior
  popup_config        jsonb     -- promo popup configuration
  gallery_config      jsonb     -- apartment image gallery settings
  analytics_config    jsonb     -- GA4 ID, Meta Pixel ID, etc.
  created_at          timestamp
  updated_at          timestamp

apartments
  id                  uuid (PK)
  project_id          uuid (FK → projects.id, on delete cascade)
  unit_id             text      -- short identifier, e.g. "unit1"
  title               text
  status              text      -- references a status key from project.statuses
  price               text
  size                text      -- m²
  rooms               text      -- bedrooms or total rooms
  floor               text      -- floor number
  balcony             text      -- balcony size or yes/no
  parking             text      -- parking info or yes/no
  view_direction      text      -- e.g. "Sør", "Vest"
  energy_rating       text      -- A, B, C, etc. (Norwegian energimerking)
  ownership_type      text      -- "Eier", "Andel", "Aksje"
  monthly_cost        text      -- felleskostnader
  total_price         text      -- total including fellesgjeld
  description         text      -- markdown supported
  viewing_date        timestamp -- optional, upcoming viewing
  viewing_note        text      -- optional, e.g. "Påmelding kreves"
  cta_override        jsonb     -- optional, overrides project.cta_config
  polygons            jsonb     -- map of view_key → [[x, y], ...] in image coords
  images              jsonb     -- array of image objects, see below
  display_order       integer
  created_at          timestamp
  updated_at          timestamp
```

**Coordinate system (critical):** Polygon points are stored in image-space
coordinates (0 to view's `image_width`, 0 to view's `image_height`), NOT
screen pixels. The embed SVG uses `viewBox="0 0 {image_width} {image_height}"`
with `preserveAspectRatio="xMidYMid meet"`. This guarantees polygons match
the image at any display size, on any device.

**Polygons per view:** Each apartment has a separate polygon definition per
view it's visible from. If an apartment isn't visible from a view (corner
unit only on the front side), that view's key is simply absent from the
`polygons` object. The widget hides such apartments when that view is active
(or shows them disabled — configurable via `config.hidden_apartment_behavior`).

---

## Configuration objects

### `views` (per project)

Array of building views. Most projects have 1-4 views (e.g. front, back, or
front/back/aerial). The architecture supports any number, but the v1 view
selector UI is designed for 2-4 views.

```json
[
  {
    "key": "front",
    "label_key": "view_front",
    "image_url": "https://.../front.jpg",
    "image_width": 2400,
    "image_height": 1600,
    "thumbnail_url": "https://.../front-thumb.jpg",
    "order": 1,
    "is_default": true
  },
  {
    "key": "back",
    "label_key": "view_back",
    "image_url": "https://.../back.jpg",
    "image_width": 2400,
    "image_height": 1600,
    "thumbnail_url": "https://.../back-thumb.jpg",
    "order": 2
  }
]
```

The `is_default: true` view is what loads when the embed first opens. The
active view is also reflected in the URL as `?view=front` for deep linking.

### `visible_fields` (per project)

Array of field keys to display in cards and detail modal. Order controls
display order.

```json
[
  "title", "price", "size", "rooms", "floor",
  "balcony", "parking", "view_direction",
  "energy_rating", "monthly_cost"
]
```

Fields not in this array are hidden from the embed (still editable in editor).

### `labels` (per project)

All client-facing strings. The embed reads with English fallbacks.

```json
{
  "view_front": "Forside",
  "view_back": "Bakside",
  "status_available": "Ledig",
  "status_reserved": "Reservert",
  "status_sold": "Solgt",
  "filter_all": "Alle",
  "filter_available": "Ledige",
  "filter_reserved": "Reserverte",
  "filter_sold": "Solgte",
  "field_price": "Pris",
  "field_size": "Størrelse",
  "field_rooms": "Soverom",
  "field_floor": "Etasje",
  "field_balcony": "Balkong",
  "field_parking": "Parkering",
  "field_view_direction": "Utsikt",
  "field_energy_rating": "Energimerking",
  "field_monthly_cost": "Felleskostnader",
  "field_total_price": "Totalpris",
  "field_ownership_type": "Eierform",
  "field_description": "Beskrivelse",
  "viewing_label": "Visning",
  "viewing_register": "Meld interesse",
  "cta_contact": "Kontakt megler",
  "cta_close": "Lukk",
  "cta_view_details": "Se detaljer",
  "no_apartments_match": "Ingen leiligheter matcher filteret",
  "switch_view_for_apartment": "Bytt til {view} for å se denne leiligheten",
  "popup_viewing_title": "Kommende visning",
  "popup_viewing_cta": "Meld interesse",
  "popup_default_title": "Interessert?",
  "popup_default_cta": "Kontakt megler"
}
```

**Rule for Claude Code:** Every user-facing string in the embed must come
from this object. Never hardcode display strings in JSX.

### `statuses` (per project)

```json
[
  {
    "key": "available",
    "label_key": "status_available",
    "color": "rgba(0, 200, 0, 0.4)",
    "stroke": "#1a7a1a",
    "clickable": true,
    "show_in_filter": true,
    "order": 1
  },
  {
    "key": "reserved",
    "label_key": "status_reserved",
    "color": "rgba(255, 165, 0, 0.4)",
    "stroke": "#b87900",
    "clickable": true,
    "show_in_filter": true,
    "order": 2
  },
  {
    "key": "sold",
    "label_key": "status_sold",
    "color": "rgba(200, 0, 0, 0.4)",
    "stroke": "#7a0000",
    "clickable": false,
    "show_in_filter": true,
    "order": 3
  }
]
```

Clients can add custom statuses ("coming soon", "rental only") without code
changes.

### `cta_config` (per project, per-apartment override possible)

```json
{
  "type": "link",
  "label_key": "cta_contact",
  "url": "https://customer-site.no/kontakt"
}
```

`type` values:

- `"link"` — Button opens URL in new tab (WordPress contact page)
- `"modal"` — Opens secondary popup with custom HTML content (per apartment
  via `cta_override`), e.g. viewing info + link to WP form
- `"email"` — `mailto:` with prefilled subject including apartment info
- `"phone"` — `tel:` link

### `popup_config` (per project)

Controls the promo popup that appears after a configurable delay on widget
load. The popup is viewing-aware: if any apartment in the project has an
upcoming `viewing_date`, the popup shows viewing-specific content; otherwise
it shows default promotional content.

```json
{
  "enabled": true,
  "delay_ms": 5000,
  "show_once_per_session": true,
  "dismissible": true,
  "when_viewing_scheduled": {
    "title_key": "popup_viewing_title",
    "body_template": "Visning {date} kl {time}. Meld deg på for å sikre plass.",
    "cta_label_key": "popup_viewing_cta",
    "cta_url": "https://customer-site.no/visning-pamelding"
  },
  "when_no_viewing": {
    "title_key": "popup_default_title",
    "body_key": "popup_default_body",
    "cta_label_key": "popup_default_cta",
    "cta_url": "https://customer-site.no/kontakt"
  }
}
```

**Behavior:**

- On widget load, check if any apartment has `viewing_date` in the future.
- After `delay_ms` milliseconds, show the popup.
- "Show once per session" uses sessionStorage (this is the one allowed use of
  sessionStorage in v1, scoped to UI-only state).
- If `dismissible: true`, popup has a close button and respects sessionStorage
  flag after dismissal.
- The popup is rendered inside the iframe with a backdrop. On mobile (container
  width < 768px), use a bottom sheet pattern instead of centered modal.

### `gallery_config` (per project)

Controls how apartment images display in cards and the detail modal.

```json
{
  "show_in_cards": false,
  "card_thumbnail_aspect": "16/9",
  "show_in_modal": true,
  "modal_layout": "gallery",
  "default_image_type": "render"
}
```

`modal_layout` values:

- `"gallery"` — Main image with thumbnail row below; click thumbnail to switch
- `"grid"` — Grid of all images, click to enlarge
- `"single"` — Just the first image, no gallery (useful for floor-plan-only)

### `analytics_config` (per project)

```json
{
  "ga4_measurement_id": "G-XXXXXXXXXX",
  "meta_pixel_id": "1234567890",
  "events_enabled": [
    "widget_load",
    "view_switch",
    "apartment_view",
    "apartment_click",
    "filter_change",
    "popup_shown",
    "popup_cta_click",
    "cta_click"
  ]
}
```

Empty fields = no events fire to that platform.

### Apartment `images` (per apartment)

Array of image objects on the apartment record:

```json
[
  {
    "url": "https://...",
    "alt": "Stue mot syd",
    "caption": "Stue med utsikt mot havet",
    "type": "render",
    "order": 1
  },
  {
    "url": "https://...",
    "alt": "Planløsning",
    "caption": "78 m²",
    "type": "floorplan",
    "order": 2
  }
]
```

`type` values: `"render"`, `"floorplan"`, `"photo"`. Used for sorting and
optionally for distinct styling (e.g. floor plans on white background).

---

## Routes

| Route                                | Purpose                              | Access            |
| ------------------------------------ | ------------------------------------ | ----------------- |
| `/editor/[projectId]`                | Polygon editor + data entry          | Shared secret     |
| `/embed/[projectSlug]`               | The embeddable widget                | Public, cached    |
| `/embed/[projectSlug]/[unitId]`      | Single-flat detail (modal preopened) | Public, cached    |
| `/api/projects/[id]`                 | CRUD for projects                    | Auth required     |
| `/api/apartments/[id]`               | CRUD for apartments                  | Auth required     |
| `/api/public/[slug]`                 | Public read-only data for embed      | Public, cached    |

Query params on `/embed/[projectSlug]`:
- `?view=front` — preselects a specific view

---

## Feature 1: Polygon editor with multi-view support

**Problem to solve:** Polygons must align perfectly with their view's image at
any display size; each apartment can have polygons on multiple views.

**Solution:**

- Project's `views` array defines available building views with images and
  dimensions.
- Editor canvas (Konva Stage) loads the currently selected view's image and
  draws polygons for that view from each apartment's `polygons[view_key]`.
- Polygon points stored as `[[x, y], ...]` in image coordinates for that view.
- Embed SVG per view uses
  `viewBox="0 0 {view.image_width} {view.image_height}"` with
  `preserveAspectRatio="xMidYMid meet"`.

**Editor view switcher:**

Above the canvas, a row of view thumbnails or labeled buttons. Clicking
switches which view is being edited. Active view is visually distinguished.

**Per-apartment drawing status indicator:**

In the apartment sidebar, show which views have polygons drawn:

```
Polygons:
  ✓ Forside drawn (4 vertices)
  ✗ Bakside not drawn
```

Prevents the "forgot to draw the back-view polygon" mistake.

**Editor capabilities (v1):**

- Upload images per view (Supabase Storage, dimensions captured automatically)
- Switch between views via thumbnail row
- Click to add polygon vertices; double-click or Enter to close
- Draggable vertex handles after closing
- Click edge to insert new vertex
- Delete key removes selected vertex (minimum 3 vertices enforced)
- **Point snapping:** snap to existing vertex within 10 image-px (essential)
- **Zoom and pan:** Ctrl + scroll, Space + drag
- **Undo (Ctrl+Z)** — redo deferred to v1.1
- Sidebar form for all apartment fields including images, viewing date
- Auto-save on field blur and polygon edit-end

**Deferred from earlier spec (cut to fit multi-view in 4 weeks):**

- Angle snapping (15° increments) — defer to v1.1
- Redo (Ctrl+Shift+Z) — defer to v1.1

Point snapping is what matters for adjacent-apartment wall alignment, which is
the practical correctness need. Angle snapping is polish that can come later.

---

## Feature 2: Status overlays (data-driven)

Each apartment's `status` references a key in the project's `statuses` config.
Embed renders polygon fill, stroke, and clickability from the status definition.

```css
.bv-polygon {
  transition: all 0.2s ease;
  cursor: pointer;
}
.bv-polygon[data-clickable="false"] {
  pointer-events: none;
  opacity: 0.4;
}
```

Fill and stroke come from inline `style` set by React, not from CSS classes.
Allows arbitrary status definitions without corresponding CSS class.

---

## Feature 3: View switcher (frontend)

A clean toggle above the image lets users switch between views. Designed for
2-4 views; redesign for more.

**Design pattern:**

- Pill-style toggle group with labels (from `view.label_key`)
- Optional small thumbnails alongside labels for visual recognition
- Active view visually distinguished
- Cross-fade transition between view images (250ms, image + polygon SVG fade
  together)
- Active view persists in URL `?view=front` for deep linking and refresh

**Empty-view handling:**

If an apartment isn't visible from the current view (no polygon for it), the
card list still shows the apartment but its card displays a small indicator
("Vises på {Bakside}" — clicking the indicator switches view and opens the
detail modal).

---

## Feature 4: Filter (scalable rule-based)

Filter UI generated from project's `statuses` array (those with
`show_in_filter: true`) plus an "All" option.

**Rule-based filtering for future extensibility:**

```ts
type FilterRule = {
  id: string;
  label: string;
  predicate: (apt: Apartment) => boolean;
};
```

V1: single-select status filter. The rule structure allows multi-dimensional
filtering later (price range, size, rooms) without refactor.

```css
.bv-hidden { display: none; }
.bv-polygon.bv-hidden { visibility: hidden; pointer-events: none; }
```

---

## Feature 5: Hover state (bidirectional)

Hovering a polygon highlights matching card. Hovering a card highlights
matching polygon (in current view if visible) and scrolls card into view.

```css
.bv-polygon { transition: all 0.2s ease; }
.bv-polygon:hover,
.bv-polygon.bv-hover {
  filter: brightness(1.2);
  stroke-width: var(--bv-stroke-width-hover, 3);
}

.bv-card { transition: all 0.2s ease; }
.bv-card:hover,
.bv-card.bv-hover {
  background: var(--bv-card-hover-bg, #f0f8ff);
  border-color: var(--bv-card-hover-border, currentColor);
}
```

JS wires bidirectional link via `unit_id` → `data-unit-id` lookup.

---

## Feature 6: Responsive layout (container queries)

**Desktop (≥ 768px container width):** image left, scrollable card list right.
Proportions via CSS variable (default 60/40).

**Mobile (< 768px):** stacked. Image full-width on top, view switcher below
image, cards below that. Detail opens full-screen modal. Popup uses bottom
sheet pattern.

**Use container queries**, because the embed lives inside an iframe of unknown
width:

```css
@container bv-root (max-width: 767px) {
  .bv-layout { grid-template-columns: 1fr; }
}
```

---

## Feature 7: Detail modal with image gallery

Clicking polygon or card opens a modal showing:

- Apartment image gallery (from `apartments.images`) with main image and
  thumbnail row, switchable by click
- All visible fields with labels (from `visible_fields` + `labels`)
- Upcoming viewing section if `viewing_date` is set and in the future
- CTA button(s) from `cta_config` (or apartment's `cta_override`)

**Modal vs navigation:** Iframe height is set by parent page. Modal overlay
is naturally contained, doesn't lose filter state, works at any iframe
height. Closes via Escape, backdrop click, or close button.

**Image gallery component:**

```
+------------------------------+
|                              |
|       Main image             |
|                              |
+------------------------------+
[thumb] [thumb] [thumb] [thumb]
```

- Main image area: full width of modal, aspect ratio preserved
- Thumbnail row: horizontally scrollable, 60px tall
- Click thumbnail to switch main image (with cross-fade)
- Keyboard: left/right arrows navigate
- Mobile: swipe gestures for main image (use a touch-friendly library or
  basic touch event handling — keep it simple)

**Floor plan handling:** If apartment has images of `type: "floorplan"`,
optionally show a "Vis planløsning" toggle that filters thumbnails to floor
plans only. Defer to v1.1 if time is tight.

**Upcoming viewing section:**

If `viewing_date` is set and in the future:

```
┌─ Visning ────────────────────────────┐
│  Søndag 14. desember kl 13:00        │
│  Påmelding kreves                    │
│  [Meld interesse]                    │
└──────────────────────────────────────┘
```

CTA may be overridden via `cta_override` to point to the viewing registration
URL rather than the default contact page.

**Deep linking:** URL `/embed/[slug]/[unitId]` loads widget with modal
pre-opened. Optionally include `?view=front` to also preselect a view.

---

## Feature 8: Promo popup

Appears after `popup_config.delay_ms` on widget load.

**Behavior:**

- On widget load, check if any apartment has `viewing_date` in the future.
- After `delay_ms`, render the popup with viewing or default content.
- Backdrop dims the widget; popup is centered on desktop, bottom sheet on
  mobile.
- Close button + backdrop click + Escape all dismiss it.
- `sessionStorage` flag `bv:popup_seen:{projectSlug}` prevents reshowing
  within the session.

**Content composition:**

If viewing scheduled, use `when_viewing_scheduled`. The `body_template`
supports placeholders `{date}`, `{time}`, `{apartment_title}` filled from the
earliest upcoming `viewing_date`.

If no viewings, use `when_no_viewing`.

**Analytics events fired:**

- `popup_shown` — when popup becomes visible
- `popup_cta_click` — when CTA clicked
- `popup_dismissed` — when closed without clicking CTA

---

## Feature 9: Analytics (outsourced)

No custom analytics dashboard. Embed fires events to platforms the customer
has configured.

The embed loads GA4 and/or Meta Pixel inside the iframe using measurement IDs
from `analytics_config`. Events fire to platforms the customer already uses.

```ts
// In lib/analytics.ts — the single dispatch point
export function track(name: string, params: Record<string, any>) {
  if (window.gtag) window.gtag('event', name, params);
  if (window.fbq) window.fbq('trackCustom', name, params);
  window.parent.postMessage({
    type: 'bv:analytics',
    event: name,
    params
  }, '*');
}
```

Components never call `gtag` or `fbq` directly. They call `track()`.

**GHL integration:** Customer sets up GHL webhook + includes parent-page
script that listens for `postMessage` events from iframe and forwards to GHL.
We provide this script (`embed-parent-helper.js`) as a copy-paste snippet.

---

## Embedding

Customer pastes into WordPress (Custom HTML block, or Bricks Code element):

```html
<div id="bv-embed-{slug}"></div>
<script src="https://yourapp.vercel.app/embed.js"
        data-project="{slug}"
        data-target="bv-embed-{slug}"
        async></script>
```

`embed.js`:
- Creates iframe pointed at `/embed/{slug}`
- Sets initial dimensions
- Listens for `postMessage` resize events, adjusts iframe height
- Forwards analytics events to parent's GA/Pixel if configured at parent level

---

## CSS customization from parent page

Embed exposes CSS custom properties on its root. Script tag's `data-*`
attributes pass overrides via URL params, embed applies as inline CSS
variables.

Supported in v1:

```
data-font                →  --bv-font-family
data-radius              →  --bv-border-radius
data-card-bg             →  --bv-card-bg
data-card-hover-bg       →  --bv-card-hover-bg
data-stroke-width-hover  →  --bv-stroke-width-hover
data-layout-split        →  --bv-layout-split (e.g. "60/40")
data-popup-style         →  --bv-popup-style (centered | bottom-sheet)
```

Status colors NOT customized via data attributes — they come from the
`statuses` config in the database (tied to data semantics).

---

## Project structure

```
/app
  /editor
    /[projectId]
      page.tsx                    -- editor UI
      EditorCanvas.tsx            -- Konva canvas
      EditorViewSwitcher.tsx      -- thumbnail row for switching views
      EditorSidebar.tsx           -- form for selected polygon/apartment
      EditorImageUploader.tsx     -- upload image for a view or apartment
      ProjectSettings.tsx         -- edit project-level config (raw JSON v1)
      hooks/useSnap.ts            -- point snapping logic
      hooks/useHistory.ts         -- undo
      hooks/useActiveView.ts      -- active view state (shared with embed)
  /embed
    /[slug]
      page.tsx                    -- main embed widget
      /[unitId]
        page.tsx                  -- detail (modal route)
      WidgetClient.tsx            -- top-level client component
      ImageCanvas.tsx             -- view image + SVG overlay (uses useActiveView)
      PolygonOverlay.tsx          -- SVG with polygons (single dispatch point)
      ViewSwitcher.tsx            -- public view selector
      CardList.tsx                -- card sidebar
      Card.tsx                    -- single card, reads visible_fields
      FilterBar.tsx               -- filter chips from statuses + rules
      DetailModal.tsx             -- modal with gallery + CTA
      ImageGallery.tsx            -- gallery component for apartment images
      ViewingBadge.tsx            -- upcoming viewing display
      PromoPopup.tsx              -- promo popup
  /api
    /projects/[id]/route.ts
    /apartments/[id]/route.ts
    /public/[slug]/route.ts
/lib
  db.ts                            -- Supabase client
  auth.ts                          -- shared-secret check
  types.ts                         -- TypeScript types for all config objects
  config-defaults.ts               -- defaults for new projects (Norwegian)
  analytics.ts                     -- single track() dispatch point
  formatters.ts                    -- price, date, m² formatting helpers
/public
  embed.js                         -- customer-facing embed script
  embed-parent-helper.js           -- optional parent-page helper for GHL
```

---

## Build order (4-week plan, 20-30 hrs/week)

### Week 1: Foundation
- Next.js + Supabase project on Vercel, GitHub auto-deploy
- Database schema with all JSONB config columns
- Image upload to Supabase Storage with dimension capture
- API routes for projects and apartments
- Default config in `config-defaults.ts` (Norwegian labels, three statuses,
  link-type CTA, sensible popup defaults)
- Basic editor: load view image on Konva canvas, click to add vertices,
  polygon closes
- View switcher in editor (even if only one view exists for the first
  project, the mechanism is in place)
- Apartment sidebar form (all fields including viewing_date, images list)

### Week 2: Editor completion
- Multi-view polygon storage (`apartments.polygons` keyed by view)
- View switcher fully functional in editor
- Per-view "drawn / not drawn" indicators in sidebar
- Vertex editing (drag, edge-click insert, delete)
- Point snapping
- Zoom and pan
- Undo
- Image upload for apartment images (gallery items)
- Goal: fully set up a multi-view project in under 45 minutes

### Week 3: Public embed
- `/embed/[slug]` with ISR (`revalidate: 60`)
- ImageCanvas with active view handling and cross-fade transition
- PolygonOverlay (data-driven status rendering)
- ViewSwitcher (public)
- CardList reading visible_fields and labels
- Bidirectional hover (cross-view aware)
- FilterBar from statuses + rules
- DetailModal with ImageGallery
- ViewingBadge and upcoming viewing display
- PromoPopup with viewing-aware content and session dismissal
- Container-query responsive layout
- `embed.js` with postMessage height handling
- Analytics dispatch via `lib/analytics.ts`

### Week 4: Customer onboarding + polish
- Enter real customer data (views, apartments, images, viewings)
- Test on real WordPress + Bricks site
- Mobile edge cases (popup bottom sheet, modal full-screen, view switcher
  touch targets)
- Image optimization (Next.js Image, Supabase transforms)
- Document embed snippet for customer
- Document optional parent-page helper for GHL
- Buffer for unknowns

---

## What's explicitly NOT in v1

- Customer-facing admin UI (login, dashboard, project management)
- Settings UIs for labels, statuses, fields, CTA, popup, analytics (raw JSON
  editing by developer in v1)
- Multi-user accounts and teams
- Stripe billing
- True interactive 3D models (Three.js / orbit controls)
- 5+ views with advanced selector UI
- Building → floor → unit drill-down
- Lead capture forms within the widget
- Custom analytics dashboard
- PDF brochures
- Finn.no integration
- Email notifications
- Per-customer rebranding UI
- Angle snapping in editor (defer to v1.1)
- Redo in editor (defer to v1.1)
- Floor-plan-only filter in gallery (defer to v1.1)

All achievable later because the data architecture supports them from day one.

---

## Open questions for the first customer (lock in week 1)

1. **Building views:** How many renders/images will be used? Just one (front),
   or multiple (front + back, etc.)? When will images be ready?
2. **Field set:** Which fields to show per apartment? Confirm: title, price,
   size, rooms, floor, balcony, parking, view direction, energy rating,
   monthly cost, ownership type, description. Missing or extra?
3. **Status terminology:** Confirm `Ledig / Reservert / Solgt` or different
   terms. Need a fourth status (e.g. "Kommende")?
4. **CTA:** Link to existing WordPress contact page? Modal with viewing info?
   Provide the contact page URL and the viewing registration URL.
5. **Popup:** Confirm 5-second delay; provide popup CTA URLs (viewing
   registration + default contact).
6. **Viewings:** Will they advertise scheduled viewings per apartment? What
   info to show (date, time, registration link, agent name)?
7. **Apartment images:** When ready (3D renders, floor plans, photos)? In
   what format and resolution?
8. **WordPress site URL:** Where the widget will live (for layout testing).
9. **Analytics:** GA4 Measurement ID? Meta Pixel ID? GHL? None in v1?
10. **Branding:** Any specific font, colors, or styling requests for their
    embed?

---

## Notes for Claude Code

1. **Read this entire file before writing code.** Configuration architecture
   is foundational. If a component renders client-visible content from
   hardcoded values, it's wrong.

2. **Build defaults in `config-defaults.ts`.** Every new project seeded with
   sensible Norwegian defaults — developer doesn't write JSON from scratch.

3. **Type everything.** Config objects (`labels`, `statuses`, `cta_config`,
   `popup_config`, `gallery_config`, `views`, `visible_fields`) get strict
   TypeScript types in `lib/types.ts`, parsed/validated when read from DB.

4. **Fail gracefully on missing config.** Missing label key → English
   fallback. Invalid status reference → render as "unknown" rather than crash.
   Missing image URL → graceful placeholder.

5. **Use the abstraction seams.**
   - All image/view access via `useActiveView()` hook
   - All polygon rendering via `<PolygonOverlay>`
   - All analytics via `analytics.track()`
   - No direct `gtag` / `fbq` / `image_url` access from feature components

6. **No localStorage. One exception: sessionStorage for popup-dismissed flag.**
   Everything else persists in Postgres.

7. **ISR for public pages.** `/embed/[slug]` and `/embed/[slug]/[unitId]`
   use `export const revalidate = 60` so updates propagate within a minute.

8. **Container queries for responsive layout.** Not viewport media queries.
   The iframe's width determines layout.

9. **Image optimization.** Use Next.js Image component with Supabase
   transform URLs for thumbnails. Don't ship full-resolution 3D renders to
   mobile clients.

10. **TypeScript strict mode on.** No `any` types in config parsing.

11. **The angle snapping and redo features are intentionally cut from v1.**
    Don't add them back. Point snapping and undo are sufficient.

12. **Modern feel comes from polish, not features.** Smooth transitions,
    snappy hover states, fast load (ISR + image optimization), keyboard
    navigation in modals, container-aware responsive behavior. These are
    what make the widget feel premium, not a longer feature list.
