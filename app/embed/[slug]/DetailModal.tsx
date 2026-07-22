'use client';

import type { Apartment, Project } from '@/lib/types';
import { resolveLabel } from '@/lib/config-defaults';
import ApartmentDetailContent from './ApartmentDetailContent';

type Props = {
  apartment: Apartment;
  project: Project;
  onClose: () => void;
};

export default function DetailModal({ apartment, project, onClose }: Props) {
  const detailPageUrl = project.cta_config.detail_page_url;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel — bottom sheet on mobile, centered modal on desktop */}
      <div className="relative bg-white w-full rounded-t-2xl sm:rounded-2xl shadow-2xl sm:max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 text-sm"
          aria-label={resolveLabel(project.labels, 'cta_close')}
        >
          ✕
        </button>

        {detailPageUrl && (
          <div className="px-5 pt-4">
            <button
              onClick={() => { window.top!.location.href = detailPageUrl.replace('{unitId}', apartment.unit_id); }}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              {resolveLabel(project.labels, 'cta_view_full_page')} →
            </button>
          </div>
        )}

        <ApartmentDetailContent apartment={apartment} project={project} variant="modal" onClose={onClose} />
      </div>
    </div>
  );
}
