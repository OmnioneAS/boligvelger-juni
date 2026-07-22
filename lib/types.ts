// ── Primitive unions ─────────────────────────────────────────────────────────

export type CtaType = 'link' | 'modal' | 'email' | 'phone';

export type GalleryLayout = 'gallery' | 'grid' | 'single';

export type ImageType = 'render' | 'floorplan' | 'photo';

export type VisibleField =
  | 'title'
  | 'price'
  | 'size'
  | 'rooms'
  | 'floor'
  | 'balcony'
  | 'parking'
  | 'view_direction'
  | 'energy_rating'
  | 'monthly_cost'
  | 'total_price'
  | 'ownership_type'
  | 'description'
  | 'collective_debt'
  | 'property_type'
  | 'completion_year'
  | 'bra'
  | 'primary_room';

export type AnalyticsEventName =
  | 'widget_load'
  | 'view_switch'
  | 'apartment_view'
  | 'apartment_click'
  | 'filter_change'
  | 'popup_shown'
  | 'popup_cta_click'
  | 'cta_click'
  | 'popup_dismissed';

// ── View definition ──────────────────────────────────────────────────────────

export type ViewDefinition = {
  key: string;
  label_key: string;
  image_url: string;
  image_width: number;
  image_height: number;
  thumbnail_url: string;
  order: number;
  is_default?: boolean;
};

// ── Labels ───────────────────────────────────────────────────────────────────
// Record<string, string> is intentionally open: projects can define custom
// label keys beyond the standard set (e.g. custom status labels).
// The standard keys are enforced by DEFAULT_LABELS in config-defaults.ts.
export type Labels = Record<string, string>;

// ── Status definition ────────────────────────────────────────────────────────

export type StatusDefinition = {
  key: string;
  label_key: string;
  color: string;   // rgba fill for polygon overlay
  stroke: string;  // hex stroke for polygon outline
  clickable: boolean;
  show_in_filter: boolean;
  order: number;
};

// ── CTA config ───────────────────────────────────────────────────────────────

export type CtaConfig = {
  type: CtaType;
  label_key: string;
  url?: string;
  modal_content?: string;
  // Per-project URL template for navigating to a standalone unit page instead
  // of opening DetailModal in place, e.g. "https://example.com/apartment/?unit={unitId}".
  // Unset (default) keeps the modal behavior for every existing project.
  detail_page_url?: string;
  // Per-project URL for the "back to overview" button on the standalone unit
  // page (/embed/[slug]/[unitId]). Unset (default) hides the button.
  overview_url?: string;
};

// ── Popup config ─────────────────────────────────────────────────────────────

export type PopupViewingConfig = {
  title_key: string;
  body_template: string;  // supports {date}, {time}, {apartment_title}
  cta_label_key: string;
  cta_url: string;
};

export type PopupDefaultConfig = {
  title_key: string;
  body_key: string;
  cta_label_key: string;
  cta_url: string;
};

export type PopupConfig = {
  enabled: boolean;
  delay_ms: number;
  show_once_per_session: boolean;
  dismissible: boolean;
  when_viewing_scheduled: PopupViewingConfig;
  when_no_viewing: PopupDefaultConfig;
};

// ── Gallery config ───────────────────────────────────────────────────────────

export type GalleryConfig = {
  show_in_cards: boolean;
  card_thumbnail_aspect: string;
  show_in_modal: boolean;
  modal_layout: GalleryLayout;
  default_image_type: ImageType;
};

// ── Analytics config ─────────────────────────────────────────────────────────

export type AnalyticsConfig = {
  ga4_measurement_id?: string;
  meta_pixel_id?: string;
  events_enabled: AnalyticsEventName[];
};

// ── Project config (general) ─────────────────────────────────────────────────

export type ProjectConfig = {
  hidden_apartment_behavior?: 'hide' | 'disabled';
};

// ── Polygon storage ──────────────────────────────────────────────────────────
// Points are in IMAGE-SPACE coordinates (0..image_width, 0..image_height).
// NOT screen pixels. The embed SVG uses viewBox to scale them to any size.
export type PolygonPoint = [number, number];
export type PolygonPoints = PolygonPoint[];
// Map of view_key → points for that view
export type Polygons = Record<string, PolygonPoints>;

// ── Apartment images ─────────────────────────────────────────────────────────

export type ApartmentImage = {
  url: string;
  alt: string;
  caption?: string;
  type: ImageType;
  order: number;
};

// ── Top-level DB row types ───────────────────────────────────────────────────

export type Project = {
  id: string;
  slug: string;
  name: string;
  views: ViewDefinition[];
  config: ProjectConfig;
  labels: Labels;
  visible_fields: VisibleField[];
  statuses: StatusDefinition[];
  cta_config: CtaConfig;
  popup_config: PopupConfig;
  gallery_config: GalleryConfig;
  analytics_config: AnalyticsConfig;
  created_at: string;
  updated_at: string;
};

export type Apartment = {
  id: string;
  project_id: string;
  unit_id: string;
  title: string;
  status: string;
  price?: string;
  size?: string;
  rooms?: string;
  floor?: string;
  balcony?: string;
  parking?: string;
  view_direction?: string;
  energy_rating?: string;
  ownership_type?: string;
  monthly_cost?: string;
  total_price?: string;
  description?: string;
  // Plain text, soft guideline ~150 chars. Used in DetailModal, Card, and the
  // Featured widget. `description` (above) is reserved for the standalone
  // single-unit page only.
  short_description?: string;
  collective_debt?: string;
  property_type?: string;
  completion_year?: string;
  bra?: string;
  primary_room?: string;
  viewing_date?: string;
  viewing_note?: string;
  cta_override?: CtaConfig;
  polygons: Polygons;
  images: ApartmentImage[];
  display_order: number;
  created_at: string;
  updated_at: string;
};
