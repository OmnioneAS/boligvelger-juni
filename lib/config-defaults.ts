import type {
  AnalyticsConfig,
  CtaConfig,
  GalleryConfig,
  Labels,
  PopupConfig,
  Project,
  ProjectConfig,
  StatusDefinition,
  VisibleField,
} from '@/lib/types';

// ── Labels (full Norwegian set) ──────────────────────────────────────────────

export const DEFAULT_LABELS: Labels = {
  view_front: 'Forside',
  view_back: 'Bakside',

  status_available: 'Ledig',
  status_reserved: 'Reservert',
  status_sold: 'Solgt',

  filter_all: 'Alle',
  filter_available: 'Ledige',
  filter_reserved: 'Reserverte',
  filter_sold: 'Solgte',

  field_price: 'Pris',
  field_size: 'Størrelse',
  field_rooms: 'Soverom',
  field_floor: 'Etasje',
  field_balcony: 'Balkong',
  field_parking: 'Parkering',
  field_view_direction: 'Utsikt',
  field_energy_rating: 'Energimerking',
  field_monthly_cost: 'Felleskostnader',
  field_total_price: 'Totalpris',
  field_ownership_type: 'Eierform',
  field_description: 'Beskrivelse',
  field_collective_debt: 'Fellesgjeld',
  field_property_type: 'Boligtype',
  field_completion_year: 'Ferdigstillelse',
  field_bra: 'Bruksareal (BRA)',
  field_primary_room: 'Primærrom (P-rom)',

  viewing_label: 'Visning',
  viewing_register: 'Meld interesse',

  cta_contact: 'Kontakt megler',
  cta_close: 'Lukk',
  cta_view_details: 'Se detaljer',
  cta_back_to_overview: 'Se alle leiligheter',

  no_apartments_match: 'Ingen leiligheter matcher filteret',
  switch_view_for_apartment: 'Bytt til {view} for å se denne leiligheten',

  popup_viewing_title: 'Kommende visning',
  popup_viewing_cta: 'Meld interesse',
  popup_default_title: 'Interessert?',
  popup_default_cta: 'Kontakt megler',

  sticky_cta_label: 'Interessert?',
};

// ── Statuses (Ledig / Reservert / Solgt) ────────────────────────────────────

export const DEFAULT_STATUSES: StatusDefinition[] = [
  {
    key: 'available',
    label_key: 'status_available',
    color: 'rgba(0, 200, 0, 0.4)',
    stroke: '#1a7a1a',
    clickable: true,
    show_in_filter: true,
    order: 1,
  },
  {
    key: 'reserved',
    label_key: 'status_reserved',
    color: 'rgba(255, 165, 0, 0.4)',
    stroke: '#b87900',
    clickable: true,
    show_in_filter: true,
    order: 2,
  },
  {
    key: 'sold',
    label_key: 'status_sold',
    color: 'rgba(200, 0, 0, 0.4)',
    stroke: '#7a0000',
    clickable: false,
    show_in_filter: true,
    order: 3,
  },
];

// ── CTA (link to contact page) ───────────────────────────────────────────────

export const DEFAULT_CTA_CONFIG: CtaConfig = {
  type: 'link',
  label_key: 'cta_contact',
  url: '',
};

// ── Popup (5 s delay, show once per session) ─────────────────────────────────

export const DEFAULT_POPUP_CONFIG: PopupConfig = {
  enabled: true,
  delay_ms: 5000,
  show_once_per_session: true,
  dismissible: true,
  when_viewing_scheduled: {
    title_key: 'popup_viewing_title',
    body_template: 'Visning {date} kl {time}. Meld deg på for å sikre plass.',
    cta_label_key: 'popup_viewing_cta',
    cta_url: '',
  },
  when_no_viewing: {
    title_key: 'popup_default_title',
    body_key: 'popup_default_body',
    cta_label_key: 'popup_default_cta',
    cta_url: '',
  },
};

// ── Gallery ──────────────────────────────────────────────────────────────────

export const DEFAULT_GALLERY_CONFIG: GalleryConfig = {
  show_in_cards: false,
  card_thumbnail_aspect: '16/9',
  show_in_modal: true,
  modal_layout: 'gallery',
  default_image_type: 'render',
};

// ── Visible fields (standard Norwegian apartment card) ───────────────────────

export const DEFAULT_VISIBLE_FIELDS: VisibleField[] = [
  'title',
  'price',
  'size',
  'rooms',
  'floor',
  'balcony',
  'parking',
  'view_direction',
  'energy_rating',
  'monthly_cost',
];

// ── Project config ───────────────────────────────────────────────────────────

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  hidden_apartment_behavior: 'hide',
};

// ── Analytics (empty — customer configures their own IDs) ────────────────────

export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  events_enabled: [],
};

// ── Factory: build a complete new-project payload ────────────────────────────
// Used by the POST /api/projects route to seed defaults on create.

export function buildDefaultProject(
  slug: string,
  name: string,
): Omit<Project, 'id' | 'created_at' | 'updated_at'> {
  return {
    slug,
    name,
    views: [],
    config: DEFAULT_PROJECT_CONFIG,
    labels: DEFAULT_LABELS,
    visible_fields: DEFAULT_VISIBLE_FIELDS,
    statuses: DEFAULT_STATUSES,
    cta_config: DEFAULT_CTA_CONFIG,
    popup_config: DEFAULT_POPUP_CONFIG,
    gallery_config: DEFAULT_GALLERY_CONFIG,
    analytics_config: DEFAULT_ANALYTICS_CONFIG,
  };
}

// ── Label resolver with English fallback ─────────────────────────────────────
// Use this everywhere you need a display string — never index labels directly.

const ENGLISH_FALLBACKS: Record<string, string> = {
  view_front: 'Front',
  view_back: 'Back',
  status_available: 'Available',
  status_reserved: 'Reserved',
  status_sold: 'Sold',
  filter_all: 'All',
  filter_available: 'Available',
  filter_reserved: 'Reserved',
  filter_sold: 'Sold',
  field_price: 'Price',
  field_size: 'Size',
  field_rooms: 'Rooms',
  field_floor: 'Floor',
  field_balcony: 'Balcony',
  field_parking: 'Parking',
  field_view_direction: 'View direction',
  field_energy_rating: 'Energy rating',
  field_monthly_cost: 'Monthly cost',
  field_total_price: 'Total price',
  field_ownership_type: 'Ownership type',
  field_description: 'Description',
  viewing_label: 'Viewing',
  viewing_register: 'Register interest',
  cta_contact: 'Contact agent',
  cta_close: 'Close',
  cta_view_details: 'View details',
  cta_back_to_overview: 'Back to all apartments',
  no_apartments_match: 'No apartments match the filter',
  popup_viewing_title: 'Upcoming viewing',
  popup_viewing_cta: 'Register interest',
  popup_default_title: 'Interested?',
  popup_default_cta: 'Contact agent',
};

export function resolveLabel(labels: Labels, key: string): string {
  return labels[key] ?? ENGLISH_FALLBACKS[key] ?? key;
}
