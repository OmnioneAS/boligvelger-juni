'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Project, Apartment, ApartmentImage, VisibleField } from '@/lib/types';
import { resolveLabel } from '@/lib/config-defaults';
import { EDITOR_INTERNAL_STRINGS } from '@/lib/editor-strings';
import { saveApartmentFields, createApartment, deleteApartment } from '@/lib/actions';

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
  | 'short_description'
  | 'collective_debt'
  | 'property_type'
  | 'completion_year'
  | 'bra'
  | 'primary_room'
  | 'viewing_date'
  | 'viewing_note';

type FormValues = Record<StringField, string>;

type FieldConfig = {
  key: StringField;
  getLabel: (p: Project) => string;
  inputType: 'text' | 'textarea' | 'datetime-local';
  // true = this key can appear in project.visible_fields (embed card field)
  isEmbedField: boolean;
  // Shown as red text beneath the field when its value is empty.
  emptyWarning?: string;
};

type Props = {
  project: Project;
  apartments: Apartment[];
  apartment: Apartment | null;
  onSaved: (updated: Apartment) => void;
  onSelectUnit: (unitId: string) => void;
  onApartmentCreated: (apt: Apartment) => void;
  onApartmentDeleted: (id: string) => void;
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
  { key: 'short_description', getLabel: p => `${resolveLabel(p.labels, 'field_short_description')} ${EDITOR_INTERNAL_STRINGS.short_description_hint}`, inputType: 'textarea', isEmbedField: false, emptyWarning: EDITOR_INTERNAL_STRINGS.short_description_empty_warning },
  { key: 'description',    getLabel: p => `${resolveLabel(p.labels, 'field_description')} ${EDITOR_INTERNAL_STRINGS.full_description_hint}`,    inputType: 'textarea', isEmbedField: true  },
  { key: 'collective_debt',  getLabel: p => resolveLabel(p.labels, 'field_collective_debt'),  inputType: 'text', isEmbedField: true  },
  { key: 'property_type',    getLabel: p => resolveLabel(p.labels, 'field_property_type'),    inputType: 'text', isEmbedField: true  },
  { key: 'completion_year',  getLabel: p => resolveLabel(p.labels, 'field_completion_year'),  inputType: 'text', isEmbedField: true  },
  { key: 'bra',              getLabel: p => resolveLabel(p.labels, 'field_bra'),              inputType: 'text', isEmbedField: true  },
  { key: 'primary_room',     getLabel: p => resolveLabel(p.labels, 'field_primary_room'),     inputType: 'text', isEmbedField: true  },
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
    description:     apt.description ?? '',
    short_description: apt.short_description ?? '',
    collective_debt: apt.collective_debt ?? '',
    property_type:   apt.property_type ?? '',
    completion_year: apt.completion_year ?? '',
    bra:             apt.bra ?? '',
    primary_room:    apt.primary_room ?? '',
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

// ── ApartmentImages sub-component ────────────────────────────────────────────

function ApartmentImages({
  apartment,
  onSaved,
}: {
  apartment: Apartment;
  onSaved: (updated: Apartment) => void;
}) {
  const [images, setImages] = useState<ApartmentImage[]>(apartment.images);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync when a different apartment is selected
  useEffect(() => {
    setImages(apartment.images);
  }, [apartment.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Reset input so the same file can be re-picked after deletion
      e.target.value = '';

      setUploadStatus('uploading');

      const fd = new FormData();
      fd.append('file', file);
      fd.append('apartmentId', apartment.id);
      fd.append('filename', `${Date.now()}_${file.name}`);

      try {
        const res = await fetch('/api/storage/upload-apartment-image', {
          method: 'POST',
          body: fd,
        });
        if (!res.ok) throw new Error('Upload failed');
        const { url } = (await res.json()) as { url: string };

        const newImage: ApartmentImage = {
          url,
          alt: '',
          type: 'render',
          order: images.length + 1,
        };
        const newImages = [...images, newImage];
        setImages(newImages);

        const result = await saveApartmentFields(apartment.id, { images: newImages });
        if (result.ok) {
          onSaved(result.apartment);
          setUploadStatus('idle');
        } else {
          throw new Error(result.error);
        }
      } catch {
        setUploadStatus('error');
        setTimeout(() => setUploadStatus('idle'), 3000);
      }
    },
    [apartment.id, images, onSaved],
  );

  const handleDelete = useCallback(
    async (idx: number) => {
      const newImages = images.filter((_, i) => i !== idx).map((img, i) => ({
        ...img,
        order: i + 1,
      }));
      setImages(newImages);
      const result = await saveApartmentFields(apartment.id, { images: newImages });
      if (result.ok) onSaved(result.apartment);
    },
    [apartment.id, images, onSaved],
  );

  const handleAltChange = useCallback(
    async (idx: number, alt: string) => {
      const newImages = images.map((img, i) => (i === idx ? { ...img, alt } : img));
      setImages(newImages);
      const result = await saveApartmentFields(apartment.id, { images: newImages });
      if (result.ok) onSaved(result.apartment);
    },
    [apartment.id, images, onSaved],
  );

  const handleTypeChange = useCallback(
    async (idx: number, type: ApartmentImage['type']) => {
      const newImages = images.map((img, i) => (i === idx ? { ...img, type } : img));
      setImages(newImages);
      const result = await saveApartmentFields(apartment.id, { images: newImages });
      if (result.ok) onSaved(result.apartment);
    },
    [apartment.id, images, onSaved],
  );

  return (
    <div className="px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          {EDITOR_INTERNAL_STRINGS.section_images}{' '}
          <span className="font-normal normal-case tracking-normal">({images.length})</span>
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadStatus === 'uploading'}
          className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          {uploadStatus === 'uploading'
            ? EDITOR_INTERNAL_STRINGS.apt_image_uploading
            : uploadStatus === 'error'
              ? EDITOR_INTERNAL_STRINGS.apt_image_upload_error
              : EDITOR_INTERNAL_STRINGS.apt_image_add}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {images.length === 0 && (
        <p className="text-xs text-zinc-400">{EDITOR_INTERNAL_STRINGS.no_images}</p>
      )}

      {images
        .sort((a, b) => a.order - b.order)
        .map((img, i) => (
          <div
            key={i}
            className="flex flex-col gap-1 border border-zinc-100 rounded p-2 bg-zinc-50"
          >
            {/* Thumbnail */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.alt}
              className="w-full h-20 object-cover rounded border border-zinc-200"
            />
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-zinc-400 shrink-0">
                {EDITOR_INTERNAL_STRINGS.apt_image_type_label}
              </label>
              <select
                value={img.type}
                onChange={(e) =>
                  handleTypeChange(i, e.target.value as ApartmentImage['type'])
                }
                className="flex-1 text-xs border border-zinc-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/40"
              >
                <option value="render">render</option>
                <option value="floorplan">floorplan</option>
                <option value="photo">photo</option>
              </select>
              <button
                onClick={() => handleDelete(i)}
                className="text-[10px] text-red-400 hover:text-red-600 shrink-0"
              >
                {EDITOR_INTERNAL_STRINGS.apt_image_delete}
              </button>
            </div>
            <input
              type="text"
              value={img.alt}
              placeholder={EDITOR_INTERNAL_STRINGS.apt_image_alt_placeholder}
              onChange={(e) => handleAltChange(i, e.target.value)}
              className="w-full text-xs border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
            />
          </div>
        ))}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EditorSidebar({ project, apartments, apartment, onSaved, onSelectUnit, onApartmentCreated, onApartmentDeleted }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addUnitId, setAddUnitId] = useState('');
  const [addTitle, setAddTitle] = useState('');
  const [addStatus, setAddStatus] = useState(project.statuses[0]?.key ?? '');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const handleAddSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!addUnitId.trim()) return;
      setAddSaving(true);
      setAddError('');
      const result = await createApartment(
        project.id,
        addUnitId.trim(),
        addTitle.trim(),
        addStatus,
        apartments.length + 1,
      );
      setAddSaving(false);
      if (result.ok) {
        onApartmentCreated(result.apartment);
        setShowAddForm(false);
        setAddUnitId('');
        setAddTitle('');
      } else {
        setAddError(EDITOR_INTERNAL_STRINGS.add_apartment_error);
      }
    },
    [addUnitId, addTitle, addStatus, apartments.length, project.id, onApartmentCreated],
  );

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDelete = useCallback(async () => {
    if (!apartment) return;
    setDeleting(true);
    setDeleteError('');
    const result = await deleteApartment(apartment.id);
    setDeleting(false);
    if (result.ok) {
      onApartmentDeleted(apartment.id);
    } else {
      setDeleteError(EDITOR_INTERNAL_STRINGS.delete_apartment_error);
      setConfirmDelete(false);
    }
  }, [apartment, onApartmentDeleted]);

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

  // ── Empty state: show apartment list so user can select one to start ────────

  if (!apartment) {
    return (
      <aside className="w-80 shrink-0 flex flex-col gap-0 overflow-y-auto bg-white border border-zinc-200 rounded-lg">
        <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-zinc-500">Select an apartment to edit</p>
            <p className="text-xs text-zinc-400 mt-0.5">Click a row to select, then draw its polygon on the canvas.</p>
          </div>
          <button
            onClick={() => { setShowAddForm(v => !v); setAddError(''); }}
            className="shrink-0 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {EDITOR_INTERNAL_STRINGS.add_apartment_btn}
          </button>
        </div>

        {/* Inline add form */}
        {showAddForm && (
          <form
            onSubmit={handleAddSubmit}
            className="px-4 py-3 border-b border-zinc-100 flex flex-col gap-2 bg-zinc-50"
          >
            <input
              type="text"
              required
              placeholder={EDITOR_INTERNAL_STRINGS.add_apartment_unit_id_placeholder}
              value={addUnitId}
              onChange={e => setAddUnitId(e.target.value)}
              className="w-full text-sm border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white"
            />
            <input
              type="text"
              placeholder={EDITOR_INTERNAL_STRINGS.add_apartment_title_placeholder}
              value={addTitle}
              onChange={e => setAddTitle(e.target.value)}
              className="w-full text-sm border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white"
            />
            <select
              value={addStatus}
              onChange={e => setAddStatus(e.target.value)}
              className="w-full text-sm border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white"
            >
              {project.statuses.sort((a, b) => a.order - b.order).map(s => (
                <option key={s.key} value={s.key}>
                  {resolveLabel(project.labels, s.label_key)}
                </option>
              ))}
            </select>
            {addError && <p className="text-xs text-red-500">{addError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addSaving || !addUnitId.trim()}
                className="flex-1 text-sm bg-zinc-900 text-white rounded px-3 py-1.5 hover:bg-zinc-700 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors"
              >
                {addSaving ? EDITOR_INTERNAL_STRINGS.add_apartment_saving : EDITOR_INTERNAL_STRINGS.add_apartment_submit}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setAddError(''); }}
                className="text-sm text-zinc-500 hover:text-zinc-700 px-3 py-1.5"
              >
                {EDITOR_INTERNAL_STRINGS.add_apartment_cancel}
              </button>
            </div>
          </form>
        )}

        <div className="flex flex-col divide-y divide-zinc-50">
          {apartments
            .sort((a, b) => a.display_order - b.display_order)
            .map((apt) => {
              const status = project.statuses.find((s) => s.key === apt.status);
              const polyCount = Object.keys(apt.polygons).length;
              return (
                <button
                  key={apt.id}
                  onClick={() => onSelectUnit(apt.unit_id)}
                  className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 transition-colors flex items-center gap-3"
                >
                  {status && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                      style={{ backgroundColor: status.color }}
                    />
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-zinc-800 truncate">
                      {apt.title || apt.unit_id}
                    </span>
                    <span className="block text-xs text-zinc-400 font-mono">{apt.unit_id}</span>
                  </span>
                  <span className={`text-xs shrink-0 ${polyCount > 0 ? 'text-emerald-500' : 'text-zinc-300'}`}>
                    {polyCount > 0 ? `${polyCount} polygon${polyCount !== 1 ? 's' : ''}` : 'no polygon'}
                  </span>
                </button>
              );
            })}
        </div>
        {apartments.length === 0 && (
          <p className="px-4 py-6 text-sm text-zinc-400 text-center">
            No apartments yet. Use "+ Add apartment" above to get started.
          </p>
        )}
        <div className="px-4 py-2 border-t border-zinc-100">
          <p className="text-[11px] text-zinc-300">{EDITOR_INTERNAL_STRINGS.no_apartment_selected}</p>
        </div>
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
          <div className="flex items-center gap-3">
            {/* Save status indicator */}
            <span
              className={[
                'text-xs font-medium transition-opacity',
                saveStatus === 'idle'   ? 'opacity-0'        : 'opacity-100',
                saveStatus === 'saving' ? 'text-zinc-400'    : '',
                saveStatus === 'saved'  ? 'text-emerald-600' : '',
                saveStatus === 'error'  ? 'text-red-500'     : '',
              ].join(' ')}
              aria-live="polite"
            >
              {saveStatus === 'saving' && EDITOR_INTERNAL_STRINGS.saving}
              {saveStatus === 'saved'  && EDITOR_INTERNAL_STRINGS.saved}
              {saveStatus === 'error'  && EDITOR_INTERNAL_STRINGS.save_error}
            </span>
            <button
              onClick={() => { setConfirmDelete(true); setDeleteError(''); }}
              className="text-xs text-red-400 hover:text-red-600"
            >
              {EDITOR_INTERNAL_STRINGS.delete_apartment_btn}
            </button>
          </div>
        </div>

        {/* Inline delete confirmation */}
        {confirmDelete && (
          <div className="rounded border border-red-200 bg-white px-3 py-2 flex flex-col gap-2">
            <p className="text-xs text-red-700">{EDITOR_INTERNAL_STRINGS.delete_apartment_confirm}</p>
            {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 text-sm font-medium bg-red-600 text-white rounded px-3 py-1.5 hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? EDITOR_INTERNAL_STRINGS.delete_apartment_deleting : EDITOR_INTERNAL_STRINGS.delete_apartment_confirm_yes}
              </button>
              <button
                onClick={() => { setConfirmDelete(false); setDeleteError(''); }}
                className="text-sm text-zinc-500 hover:text-zinc-700 border border-zinc-200 rounded px-3 py-1.5"
              >
                {EDITOR_INTERNAL_STRINGS.delete_apartment_cancel}
              </button>
            </div>
          </div>
        )}

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
              {cfg.emptyWarning && !formValues[cfg.key] && (
                <p className="text-[10px] text-red-500 mt-0.5">{cfg.emptyWarning}</p>
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

      {/* ── Apartment images ── */}
      <ApartmentImages apartment={apartment} onSaved={onSaved} />
    </aside>
  );
}
