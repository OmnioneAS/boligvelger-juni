'use client';

import { useState, useCallback } from 'react';
import type { Project, VisibleField, CtaType } from '@/lib/types';
import { saveProjectConfig } from '@/lib/actions';
import { DEFAULT_FEATURED_CONFIG } from '@/lib/config-defaults';

type Props = {
  project: Project;
  onSaved: (updated: Project) => void;
  onClose: () => void;
};

const ALL_VISIBLE_FIELDS: { key: VisibleField; label: string }[] = [
  { key: 'title',          label: 'Title' },
  { key: 'price',          label: 'Price' },
  { key: 'size',           label: 'Size' },
  { key: 'rooms',          label: 'Rooms' },
  { key: 'floor',          label: 'Floor' },
  { key: 'balcony',        label: 'Balcony' },
  { key: 'parking',        label: 'Parking' },
  { key: 'view_direction', label: 'View direction' },
  { key: 'energy_rating',  label: 'Energy rating' },
  { key: 'monthly_cost',   label: 'Monthly cost' },
  { key: 'total_price',    label: 'Total price' },
  { key: 'ownership_type',  label: 'Ownership type' },
  { key: 'description',     label: 'Description' },
  { key: 'collective_debt', label: 'Fellesgjeld' },
  { key: 'property_type',   label: 'Boligtype' },
  { key: 'completion_year', label: 'Ferdigstillelse' },
  { key: 'bra',             label: 'Bruksareal (BRA)' },
  { key: 'primary_room',    label: 'Primærrom (P-rom)' },
];

export default function EditorSettings({ project, onSaved, onClose }: Props) {
  const [visibleFields, setVisibleFields] = useState<VisibleField[]>(project.visible_fields);
  const [labels, setLabels] = useState<Record<string, string>>({ ...project.labels });
  const [ctaConfig, setCtaConfig] = useState({ ...project.cta_config });
  const [popupEnabled, setPopupEnabled]     = useState(project.popup_config.enabled);
  const [popupDelaySec, setPopupDelaySec]   = useState(Math.round(project.popup_config.delay_ms / 1000));
  const [popupCtaUrl, setPopupCtaUrl]       = useState(project.popup_config.when_no_viewing.cta_url ?? '');

  const [featuredSlotCount, setFeaturedSlotCount] = useState(
    project.featured_config.slot_count ?? DEFAULT_FEATURED_CONFIG.slot_count!,
  );
  const [featuredRotationDays, setFeaturedRotationDays] = useState(
    project.featured_config.rotation_days ?? DEFAULT_FEATURED_CONFIG.rotation_days!,
  );
  const [featuredTitle, setFeaturedTitle] = useState(
    project.featured_config.title ?? DEFAULT_FEATURED_CONFIG.title!,
  );
  const [featuredHeading, setFeaturedHeading] = useState(
    project.featured_config.heading ?? DEFAULT_FEATURED_CONFIG.heading!,
  );
  const [featuredDescription, setFeaturedDescription] = useState(
    project.featured_config.description ?? DEFAULT_FEATURED_CONFIG.description!,
  );

  const [saving, setSaving]       = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const toggleField = useCallback((field: VisibleField) => {
    setVisibleFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field],
    );
  }, []);

  const setLabel = useCallback((key: string, value: string) => {
    setLabels(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const newPopupConfig = {
      ...project.popup_config,
      enabled: popupEnabled,
      delay_ms: popupDelaySec * 1000,
      when_no_viewing: { ...project.popup_config.when_no_viewing, cta_url: popupCtaUrl },
    };
    const result = await saveProjectConfig(project.id, {
      visible_fields: visibleFields,
      labels,
      cta_config: ctaConfig,
      popup_config: newPopupConfig,
      // Spread the existing featured_config first — selected_unit_ids and
      // last_rotated_at are managed by the widget's own reconciliation
      // logic, never edited here, and a jsonb column update replaces the
      // whole object rather than merging.
      featured_config: {
        ...project.featured_config,
        slot_count: featuredSlotCount,
        rotation_days: featuredRotationDays,
        title: featuredTitle,
        heading: featuredHeading,
        description: featuredDescription,
      },
    });
    setSaving(false);
    if (result.ok) {
      onSaved(result.project);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } else {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [
    visibleFields, labels, ctaConfig, popupEnabled, popupDelaySec, popupCtaUrl,
    featuredSlotCount, featuredRotationDays, featuredTitle, featuredHeading, featuredDescription,
    project, onSaved,
  ]);

  return (
    <div className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-100">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-800">Project settings</h2>
        <button onClick={onClose} className="text-xs text-zinc-400 hover:text-zinc-600">
          ← Back to editor
        </button>
      </div>

      {/* ── Visible fields ── */}
      <div className="px-5 py-4 flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          Visible fields in embed
        </h3>
        <div className="grid grid-cols-2 gap-y-2">
          {ALL_VISIBLE_FIELDS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleFields.includes(key)}
                onChange={() => toggleField(key)}
                className="rounded"
              />
              <span className="text-sm text-zinc-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Field labels ── */}
      <div className="px-5 py-4 flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          Field labels
        </h3>
        {ALL_VISIBLE_FIELDS.map(({ key }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 font-mono w-28 shrink-0">{key}</span>
            <input
              type="text"
              value={labels[`field_${key}`] ?? ''}
              onChange={e => setLabel(`field_${key}`, e.target.value)}
              className="flex-1 text-sm border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        ))}
      </div>

      {/* ── Status labels ── */}
      <div className="px-5 py-4 flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          Status labels
        </h3>
        {project.statuses.sort((a, b) => a.order - b.order).map(status => (
          <div key={status.key} className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full shrink-0 border border-black/10"
              style={{ backgroundColor: status.color }}
            />
            <span className="text-xs text-zinc-400 font-mono w-20 shrink-0">{status.key}</span>
            <input
              type="text"
              value={labels[status.label_key] ?? ''}
              onChange={e => setLabel(status.label_key, e.target.value)}
              className="flex-1 text-sm border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        ))}
      </div>

      {/* ── CTA ── */}
      <div className="px-5 py-4 flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          Call to action
        </h3>
        <div>
          <label className="text-xs text-zinc-400 block mb-0.5">Type</label>
          <select
            value={ctaConfig.type}
            onChange={e => setCtaConfig(prev => ({ ...prev, type: e.target.value as CtaType }))}
            className="w-full text-sm border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white"
          >
            <option value="link">Link (opens URL)</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-0.5">
            {ctaConfig.type === 'link' ? 'URL' : ctaConfig.type === 'email' ? 'Email address' : 'Phone number'}
          </label>
          <input
            type="text"
            value={ctaConfig.url ?? ''}
            onChange={e => setCtaConfig(prev => ({ ...prev, url: e.target.value }))}
            className="w-full text-sm border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-0.5">Button label</label>
          <input
            type="text"
            value={labels[ctaConfig.label_key] ?? ''}
            onChange={e => setLabel(ctaConfig.label_key, e.target.value)}
            className="w-full text-sm border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
      </div>

      {/* ── Navigation (standalone unit page) ── */}
      <div className="px-5 py-4 flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          Navigation
        </h3>
        <div>
          <label className="text-xs text-zinc-400 block mb-0.5">
            Detail page URL (leave empty to keep the in-widget modal)
          </label>
          <input
            type="text"
            placeholder="https://example.com/apartment/?unit={unitId}"
            value={ctaConfig.detail_page_url ?? ''}
            onChange={e => setCtaConfig(prev => ({ ...prev, detail_page_url: e.target.value || undefined }))}
            className="w-full text-sm border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-0.5">
            Overview page URL (shown as a &quot;back&quot; button on the standalone unit page)
          </label>
          <input
            type="text"
            placeholder="https://example.com/apartments/"
            value={ctaConfig.overview_url ?? ''}
            onChange={e => setCtaConfig(prev => ({ ...prev, overview_url: e.target.value || undefined }))}
            className="w-full text-sm border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
      </div>

      {/* ── Featured units widget ── */}
      <div className="px-5 py-4 flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          Featured units widget
        </h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-zinc-400 block mb-0.5">Slots</label>
            <input
              type="number"
              min={1}
              value={featuredSlotCount}
              onChange={e => setFeaturedSlotCount(Math.max(1, Number(e.target.value)))}
              className="w-full text-sm border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-zinc-400 block mb-0.5">Rotation (days)</label>
            <input
              type="number"
              min={1}
              value={featuredRotationDays}
              onChange={e => setFeaturedRotationDays(Math.max(1, Number(e.target.value)))}
              className="w-full text-sm border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-0.5">Title (small label)</label>
          <input
            type="text"
            value={featuredTitle}
            onChange={e => setFeaturedTitle(e.target.value)}
            className="w-full text-sm border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-0.5">Heading</label>
          <input
            type="text"
            value={featuredHeading}
            onChange={e => setFeaturedHeading(e.target.value)}
            className="w-full text-sm border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-0.5">Description</label>
          <textarea
            value={featuredDescription}
            onChange={e => setFeaturedDescription(e.target.value)}
            rows={2}
            className="w-full text-sm border border-zinc-200 rounded px-2 py-1.5 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <p className="text-[10px] text-zinc-400">
          Pick which apartments are featured from each apartment&apos;s panel in the sidebar.
        </p>
      </div>

      {/* ── Popup ── */}
      <div className="px-5 py-4 flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Popup</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={popupEnabled}
            onChange={e => setPopupEnabled(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-zinc-700">Enable popup</span>
        </label>
        {popupEnabled && (
          <>
            <div>
              <label className="text-xs text-zinc-400 block mb-0.5">Delay (seconds)</label>
              <input
                type="number"
                min={0}
                value={popupDelaySec}
                onChange={e => setPopupDelaySec(Number(e.target.value))}
                className="w-full text-sm border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-0.5">CTA link URL</label>
              <input
                type="text"
                value={popupCtaUrl}
                onChange={e => setPopupCtaUrl(e.target.value)}
                className="w-full text-sm border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
          </>
        )}
      </div>

      {/* Save */}
      <div className="px-5 py-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saveStatus === 'saved' && <span className="text-sm text-emerald-600">Saved ✓</span>}
        {saveStatus === 'error'  && <span className="text-sm text-red-500">Save failed</span>}
      </div>
    </div>
  );
}
