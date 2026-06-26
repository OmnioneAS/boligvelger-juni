// All editor-internal UI strings that are NOT in project.labels.
// project.labels is the customer-facing config (embed strings).
// This file is for admin-tool chrome: field labels that don't exist in labels
// (viewing_date, viewing_note, title, unit_id), status indicators, flash messages.
//
// Rule: every string in editor components that isn't resolved via resolveLabel()
// must come from this constant — never scattered inline.

export const EDITOR_INTERNAL_STRINGS = {
  // ── Field labels missing from project.labels ─────────────────────────────
  // (project.labels has field_price, field_size, etc. but not these)
  field_title: 'Title',
  field_unit_id: 'Unit ID',
  field_viewing_date: 'Viewing date',
  field_viewing_note: 'Viewing note',

  // ── Auto-save indicator ───────────────────────────────────────────────────
  saved: 'Saved ✓',
  saving: 'Saving…',
  save_error: 'Save failed',

  // ── Sidebar sections ──────────────────────────────────────────────────────
  section_status: 'Status',
  section_fields: 'Fields',
  section_polygon_status: 'Polygon status',
  section_images: 'Images',

  // ── Sidebar empty / placeholder states ───────────────────────────────────
  no_apartment_selected: 'Select a polygon on the canvas to edit an apartment.',
  no_images: 'No images uploaded yet.',

  // ── Polygon status indicators ─────────────────────────────────────────────
  polygon_drawn: 'Drawn',
  polygon_not_drawn: 'Not drawn',

  // ── Embed visibility badge ────────────────────────────────────────────────
  hidden_in_embed: 'hidden in embed',

  // ── Image uploader ────────────────────────────────────────────────────────
  upload_image: 'Upload image',
  replace_image: 'Replace image',
  uploading: 'Uploading…',
  upload_error: 'Upload failed',
} as const;

export type EditorInternalStringKey = keyof typeof EDITOR_INTERNAL_STRINGS;
