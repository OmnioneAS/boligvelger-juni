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

  // ── View image uploader ───────────────────────────────────────────────────
  upload_image: 'Upload image',
  replace_image: 'Replace image',
  uploading: 'Uploading…',
  upload_error: 'Upload failed',

  // ── Add apartment form ────────────────────────────────────────────────────
  add_apartment_btn: '+ Add apartment',
  add_apartment_unit_id_placeholder: 'e.g. H0101',
  add_apartment_title_placeholder: 'e.g. Apartment 1',
  add_apartment_submit: 'Add',
  add_apartment_cancel: 'Cancel',
  add_apartment_saving: 'Adding…',
  add_apartment_error: 'Failed — unit ID may already exist',

  // ── Apartment image uploader ──────────────────────────────────────────────
  apt_image_add: 'Add image',
  apt_image_delete: 'Delete',
  apt_image_uploading: 'Uploading…',
  apt_image_upload_error: 'Upload failed',
  apt_image_type_label: 'Type',
  apt_image_alt_label: 'Alt text',
  apt_image_alt_placeholder: 'e.g. Living room facing south',
} as const;

export type EditorInternalStringKey = keyof typeof EDITOR_INTERNAL_STRINGS;
