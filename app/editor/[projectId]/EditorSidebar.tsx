'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Project, Apartment, VisibleField } from '@/lib/types';
import { resolveLabel } from '@/lib/config-defaults';
import { EDITOR_INTERNAL_STRINGS } from '@/lib/editor-strings';
import { saveApartmentFields } from '@/lib/actions';

// ── Types ────────────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// All string-valued apartment fields (excludes polygons, images, display_order).
type StringField =
  | 'title'
  | 'price'
  | 'size'
  | 'rooms'
  | 'floor'
  | 'balcony'
  | 'parking'
  | 'view_direction'
  | 'energy_rating'
  | 'ownership_type'
  | 'monthly_cost'
  | 'total_price'
  | 'description'
  | 'viewing_date'
  | 'viewing_note';

type FormValues = Record<StringField, string>;

type FieldConfig = {
  key: StringField;
  getLabel: (p: Project) => string;
  inputType: 'text' | 'textarea' | 'datetime-local';
  // true = this key can appear in project.visible_fields (embed card field)
  isEmbedField: boolean;
};

type Props = {
  project: Project;
  apartment: Apartment | null;
  onSaved: (updated: Apartment) => void;
};

// ── Field configuration (drives the form rows) ────────────────────────────────
// Ordering matches the apartment data model in SPEC.md.

const FIELD_CONFIGS: FieldConfig[] = [
  { key: 'price',          getLabel: p => resolveLabel(p.labels, 'field_price'),          inputType: 'text',           isEmbedField: true  },
  { key: 'size',           getLabel: p => resolveLabel(p.labels, 'field_size'),           inputType: 'text',           isEmbedField: true  },
  { key: 'rooms',          getLabel: p => resolveLabel(p.labels, 'field_rooms'),          inputType: 'text',           isEmbedField: true  },
  { key: 'floor',          getLabel: p => resolveLabel(p.labels, 'field_floor'),          inputType: 'text',           isEmbedField: true  },
  { key: 'balcony',        getLabel: p => resolveLabel(p.labels, 'field_balcony'),        inputType: 'text',           isEmbedField: true  },
  { key: 'parking',        getLabel: p => resolveLabel(p.labels, 'field_parking'),        inputType: 'text',           isEmbedField: true  },
  { key: 'view_direction', getLabel: p => resolveLabel(p.labels, 'field_view_direction'), inputType: 'text',           isEmbedField: true  },
  { key: 'energy_rating',  getLabel: p => resolveLabel(p.labels, 'field_energy_rating'),  inputType: 'text',           isEmbedField: true  },
  { key: 'ownership_type', getLabel: p => resolveLabel(p.labels, 'field_ownership_type'), inputType: 'text',           isEmbedField: true  },
  { key: 'monthly_cost',   getLabel: p => resolveLabel(p.labels, 'field_monthly_cost'),   inputType: 'text',           isEmbedField: true  },
  { key: 'total_price',    getLabel: p => resolveLabel(p.labels, 'field_total_price'),    inputType: 'text',           isEmbedField: true  },
  { key: 'description',    getLabel: p => resolveLabel(p.labels, 'field_description'),    inputType: 'textarea',       isEmbedField: true  },
  // Admin-only fields — labels from EDITOR_INTERNAL_STRINGS, never in visible_fields.
  { key: 'viewing_date',   getLabel: () => EDITOR_INTERNAL_STRINGS.field_viewing_date,   inputType: 'datetime-local', isEmbedField: false },
  { key: 'viewing_note',   getLabel: () => EDITOR_INTERNAL_STRINGS.field_viewing_note,   inputType: 'text',           isEmbedField: false },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function initFormValues(apt: Apartment): FormValues {
  return {
    title:          apt.title ?? '',
    price:          apt.price ?? '',
    size:           apt.size ?? '',
    rooms:          apt.rooms ?? '',
    floor:          apt.floor ?? '',
    balcony:        apt.balcony ?? '',
    parking:        apt.parking ?? '',
    view_direction: apt.view_direction ?? '',
    energy_rating:  apt.energy_rating ?? '',
    ownership_type: apt.ownership_type ?? '',
    monthly_cost:   apt.monthly_cost ?? '',
    total_price:    apt.total_price ?? '',
    description:    apt.description ?? '',
    // datetime-local expects "YYYY-MM-DDTHH:MM" — slice ISO to 16 chars.
    viewing_date:   apt.viewing_date ? apt.viewing_date.slice(0, 16) : '',
    viewing_note:   apt.viewing_note ?? '',
  };
}

function getOriginalValue(apt: Apartment, key: StringField): string {
  if (key === 'viewing_date') return apt.viewing_date ? apt.viewing_date.slice(0, 16) : '';
  const raw = apt[key as keyof Apartment];
  return typeof raw === 'string' ? raw : '';
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EditorSidebar({ project, apartment, onSaved }: Props) {
  const [formValues, setFormValues] = useState<FormValues>(
    apartment ? initFormValues(apartment) : initFormValues({} as Apartment),
  );
  // Status is saved on change (select), so we track it separately for
  // optimistic UI (avoids flickering back to old value during the save).
  const [localStatus, setLocalStatus] = useState(apartment?.status ?? '');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Sync form when a different apartment is selected.
  useEffect(() => {
    if (!apartment) return;
    setFormValues(initFormValues(apartment));
    setLocalStatus(apartment.status);
  }, [apartment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSaveStatusWithTimeout = useCallback(
    (status: 'saved' | 'error') => {
      if (saveTimer) clearTimeout(saveTimer);
      setSaveStatus(status);
      const t = setTimeout(() => setSaveStatus('idle'), status === 'saved' ? 2000 : 3000);
      setSaveTimer(t);
    },
    [saveTimer],
  );

  // Auto-save a string field on blur.
  const handleBlur = useCallback(
    async (key: StringField) => {
      if (!apartment) return;
      const current = formValues[key];
      const original = getOriginalValue(apartment, key);
      if (current === original) return;

      setSaveStatus('saving');
      // Empty string → null so Postgres clears the column.
      const patchValue = current === '' ? null : current;
      const result = await saveApartmentFields(apartment.id, { [key]: patchValue });

      if (result.ok) {
        onSaved(result.apartment);
        setSaveStatusWithTimeout('saved');
      } else {
        setSaveStatusWithTimeout('error');
      }
    },
    [apartment, formValues, onSaved, setSaveStatusWithTimeout],
  );

  // Auto-save status on change (select, not blur). Optimistic update first.
  const handleStatusChange = useCallback(
    async (value: string) => {
      if (!apartment) return;
      setLocalStatus(value);
      setSaveStatus('saving');
      const result = await saveApartmentFields(apartment.id, { status: value });
      if (result.ok) {
        onSaved(result.apartment);
        setSaveStatusWithTimeout('saved');
      } else {
        setLocalStatus(apartment.status); // revert on failure
        setSaveStatusWithTimeout('error');
      }
    },
    [apartment, onSaved, setSaveStatusWithTimeout],
  );

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!apartment) {
    return (
      <aside className="w-80 shrink-0 flex items-start justify-center pt-16 text-center">
        <p className="text-sm text-zinc-400 px-4">{EDITOR_INTERNAL_STRINGS.no_apartment_selected}</p>
      </aside>
    );
  }

  const visibleFieldSet = new Set<string>(project.visible_fields as string[]);
  const selectedStatus = project.statuses.find(s => s.key === apartment.status);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <aside className="w-80 shrink-0 flex flex-col gap-0 overflow-y-auto bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-100">
      {/* ── Header: unit_id + title + save indicator ── */}
      <div className="px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded">
            {apartment.unit_id}
          </span>
          {/* Save status indicator */}
          <span
            className={[
              'text-xs font-medium transition-opacity',
              saveStatus === 'idle'   ? 'opacity-0'              : 'opacity-100',
              saveStatus === 'saving' ? 'text-zinc-400'          : '',
              saveStatus === 'saved'  ? 'text-emerald-600'       : '',
              saveStatus === 'error'  ? 'text-red-500'           : '',
            ].join(' ')}
            aria-live="polite"
          >
            {saveStatus === 'saving' && EDITOR_INTERNAL_STRINGS.saving}
            {saveStatus === 'saved'  && EDITOR_INTERNAL_STRINGS.saved}
            {saveStatus === 'error'  && EDITOR_INTERNAL_STRINGS.save_error}
          </span>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs text-zinc-400 mb-0.5">
            {EDITOR_INTERNAL_STRINGS.field_title}
          </label>
          <input
            type="text"
            value={formValues.title}
            onChange={e => setFormValues(prev => ({ ...prev, title: e.target.value }))}
            onBlur={() => handleBlur('title')}
            className="w-full text-sm font-medium text-zinc-900 border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs text-zinc-400 mb-0.5">
            {EDITOR_INTERNAL_STRINGS.section_status}
          </label>
          <div className="flex items-center gap-2">
            {selectedStatus && (
              <span
                className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                style={{ backgroundColor: selectedStatus.color }}
              />
            )}
            <select
              value={localStatus}
              onChange={e => handleStatusChange(e.target.value)}
              className="flex-1 text-sm border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white"
            >
              {project.statuses
                .sort((a, b) => a.order - b.order)
                .map(s => (
                  <option key={s.key} value={s.key}>
                    {resolveLabel(project.labels, s.label_key)}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Field rows ── */}
      <div className="px-4 py-3 flex flex-col gap-2">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          {EDITOR_INTERNAL_STRINGS.section_fields}
        </p>
        {FIELD_CONFIGS.map(cfg => {
          const hiddenInEmbed =
            cfg.isEmbedField && !visibleFieldSet.has(cfg.key as VisibleField);
          const label = cfg.getLabel(project);

          return (
            <div key={cfg.key}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <label className="text-xs text-zinc-500">{label}</label>
                {hiddenInEmbed && (
                  <span className="text-[10px] text-zinc-300 bg-zinc-50 border border-zinc-100 rounded px-1">
                    {EDITOR_INTERNAL_STRINGS.hidden_in_embed}
                  </span>
                )}
              </div>
              {cfg.inputType === 'textarea' ? (
                <textarea
                  value={formValues[cfg.key]}
                  onChange={e =>
                    setFormValues(prev => ({ ...prev, [cfg.key]: e.target.value }))
                  }
                  onBlur={() => handleBlur(cfg.key)}
                  rows={3}
                  className="w-full text-sm border border-zinc-200 rounded px-2 py-1.5 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              ) : (
                <input
                  type={cfg.inputType}
                  value={formValues[cfg.key]}
                  onChange={e =>
                    setFormValues(prev => ({ ...prev, [cfg.key]: e.target.value }))
                  }
                  onBlur={() => handleBlur(cfg.key)}
                  className="w-full text-sm border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Polygon status ── */}
      <div className="px-4 py-3 flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-0.5">
          {EDITOR_INTERNAL_STRINGS.section_polygon_status}
        </p>
        {project.views.length === 0 && (
          <p className="text-xs text-zinc-400">No views configured.</p>
        )}
        {project.views
          .sort((a, b) => a.order - b.order)
          .map(view => {
            const pts = apartment.polygons[view.key];
            const drawn = pts && pts.length >= 3;
            return (
              <div key={view.key} className="flex items-center gap-2 text-xs">
                <span className={drawn ? 'text-emerald-500' : 'text-zinc-300'}>
                  {drawn ? '✓' : '✗'}
                </span>
                <span className="text-zinc-600">
                  {resolveLabel(project.labels, view.label_key)}
                </span>
                <span className="text-zinc-400 ml-auto">
                  {drawn
                    ? `${pts.length} vertices`
                    : EDITOR_INTERNAL_STRINGS.polygon_not_drawn}
                </span>
              </div>
            );
          })}
      </div>

      {/* ── Images list (read-only in Week 1; upload comes in Week 2) ── */}
      <div className="px-4 py-3 flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-0.5">
          {EDITOR_INTERNAL_STRINGS.section_images}{' '}
          <span className="font-normal normal-case tracking-normal">
            ({apartment.images.length})
          </span>
        </p>
        {apartment.images.length === 0 ? (
          <p className="text-xs text-zinc-400">{EDITOR_INTERNAL_STRINGS.no_images}</p>
        ) : (
          apartment.images
            .sort((a, b) => a.order - b.order)
            .map((img, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-mono shrink-0">
                  {img.type}
                </span>
                <span className="text-zinc-600 truncate">{img.alt || img.url}</span>
                <span className="text-zinc-300 shrink-0">#{img.order}</span>
              </div>
            ))
        )}
      </div>
    </aside>
  );
}
