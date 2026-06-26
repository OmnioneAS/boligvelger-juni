-- Seed a test project with one view pointing at a Picsum placeholder image.
-- Fixed UUID so the editor URL is predictable:
--   /editor/00000000-0000-0000-0000-000000000001
--
-- Navigate there after running: npx supabase db push

insert into projects (
  id,
  slug,
  name,
  views,
  config,
  labels,
  visible_fields,
  statuses,
  cta_config,
  popup_config,
  gallery_config,
  analytics_config
) values (
  '00000000-0000-0000-0000-000000000001',
  'test-project',
  'Test Project',

  -- views: one front-facing view using a 2400×1600 Picsum placeholder
  '[
    {
      "key":           "front",
      "label_key":     "view_front",
      "image_url":     "https://picsum.photos/id/1074/2400/1600",
      "image_width":   2400,
      "image_height":  1600,
      "thumbnail_url": "https://picsum.photos/id/1074/240/160",
      "order":         1,
      "is_default":    true
    }
  ]',

  -- config
  '{"hidden_apartment_behavior": "hide"}',

  -- labels (full Norwegian set)
  '{
    "view_front":                  "Forside",
    "view_back":                   "Bakside",
    "status_available":            "Ledig",
    "status_reserved":             "Reservert",
    "status_sold":                 "Solgt",
    "filter_all":                  "Alle",
    "filter_available":            "Ledige",
    "filter_reserved":             "Reserverte",
    "filter_sold":                 "Solgte",
    "field_price":                 "Pris",
    "field_size":                  "Størrelse",
    "field_rooms":                 "Soverom",
    "field_floor":                 "Etasje",
    "field_balcony":               "Balkong",
    "field_parking":               "Parkering",
    "field_view_direction":        "Utsikt",
    "field_energy_rating":         "Energimerking",
    "field_monthly_cost":          "Felleskostnader",
    "field_total_price":           "Totalpris",
    "field_ownership_type":        "Eierform",
    "field_description":           "Beskrivelse",
    "viewing_label":               "Visning",
    "viewing_register":            "Meld interesse",
    "cta_contact":                 "Kontakt megler",
    "cta_close":                   "Lukk",
    "cta_view_details":            "Se detaljer",
    "no_apartments_match":         "Ingen leiligheter matcher filteret",
    "switch_view_for_apartment":   "Bytt til {view} for å se denne leiligheten",
    "popup_viewing_title":         "Kommende visning",
    "popup_viewing_cta":           "Meld interesse",
    "popup_default_title":         "Interessert?",
    "popup_default_cta":           "Kontakt megler"
  }',

  -- visible_fields
  '["title","price","size","rooms","floor","balcony","parking","view_direction","energy_rating","monthly_cost"]',

  -- statuses
  '[
    {
      "key":            "available",
      "label_key":      "status_available",
      "color":          "rgba(0, 200, 0, 0.4)",
      "stroke":         "#1a7a1a",
      "clickable":      true,
      "show_in_filter": true,
      "order":          1
    },
    {
      "key":            "reserved",
      "label_key":      "status_reserved",
      "color":          "rgba(255, 165, 0, 0.4)",
      "stroke":         "#b87900",
      "clickable":      true,
      "show_in_filter": true,
      "order":          2
    },
    {
      "key":            "sold",
      "label_key":      "status_sold",
      "color":          "rgba(200, 0, 0, 0.4)",
      "stroke":         "#7a0000",
      "clickable":      false,
      "show_in_filter": true,
      "order":          3
    }
  ]',

  -- cta_config
  '{"type": "link", "label_key": "cta_contact", "url": ""}',

  -- popup_config
  '{
    "enabled":               true,
    "delay_ms":              5000,
    "show_once_per_session": true,
    "dismissible":           true,
    "when_viewing_scheduled": {
      "title_key":     "popup_viewing_title",
      "body_template": "Visning {date} kl {time}. Meld deg på for å sikre plass.",
      "cta_label_key": "popup_viewing_cta",
      "cta_url":       ""
    },
    "when_no_viewing": {
      "title_key":     "popup_default_title",
      "body_key":      "popup_default_body",
      "cta_label_key": "popup_default_cta",
      "cta_url":       ""
    }
  }',

  -- gallery_config
  '{
    "show_in_cards":          false,
    "card_thumbnail_aspect":  "16/9",
    "show_in_modal":          true,
    "modal_layout":           "gallery",
    "default_image_type":     "render"
  }',

  -- analytics_config
  '{"events_enabled": []}'
)
on conflict (id) do nothing;

-- Seed two test apartments so the sidebar and card list have something to show
insert into apartments (project_id, unit_id, title, status, price, size, rooms, floor, display_order)
values
  ('00000000-0000-0000-0000-000000000001', 'unit1', 'Leilighet 1A', 'available',  '3 500 000 kr', '65 m²', '2', '2', 1),
  ('00000000-0000-0000-0000-000000000001', 'unit2', 'Leilighet 1B', 'reserved',   '4 200 000 kr', '82 m²', '3', '3', 2)
on conflict (project_id, unit_id) do nothing;
