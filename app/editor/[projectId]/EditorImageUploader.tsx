'use client';

import { useRef, useState } from 'react';
import type { Project, ViewDefinition } from '@/lib/types';
import type { UseActiveViewReturn } from './hooks/useActiveView';
import { resolveLabel } from '@/lib/config-defaults';
import { EDITOR_INTERNAL_STRINGS } from '@/lib/editor-strings';
import { saveProjectViews } from '@/lib/actions';

// ── Types ────────────────────────────────────────────────────────────────────

type Props = {
  project: Project;
  views: ViewDefinition[];           // current views state from EditorShell
  activeViewHook: UseActiveViewReturn;
  onViewsUpdated: (views: ViewDefinition[]) => void;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function measureImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error('Could not read image dimensions'));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EditorImageUploader({
  project,
  views,
  activeViewHook,
  onViewsUpdated,
}: Props) {
  const { activeView } = activeViewHook; // abstraction seam — never read image_url directly
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!activeView) return null;

  const hasImage = Boolean(activeView.image_url);
  const viewLabel = resolveLabel(project.labels, activeView.label_key);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset for re-use of the same file input
    e.target.value = '';

    setUploading(true);
    setError(null);

    try {
      // 1. Measure dimensions client-side (browser Image API).
      const { width, height } = await measureImageDimensions(file);

      // 2. Upload the file to Supabase Storage via the API route.
      //    The editor_auth cookie is included automatically by the browser.
      const body = new FormData();
      body.append('file', file);
      body.append('projectId', project.id);
      body.append('viewKey', activeView.key);

      const res = await fetch('/api/storage/upload-view-image', {
        method: 'POST',
        body,
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? 'Upload failed');
      }

      const { url } = (await res.json()) as { url: string };

      // 3. Patch the active view in the views array (image-space coords update).
      const updatedViews = views.map(v =>
        v.key === activeView.key
          ? { ...v, image_url: url, image_width: width, image_height: height }
          : v,
      );

      // 4. Persist to DB via Server Action.
      const result = await saveProjectViews(project.id, updatedViews);
      if (!result.ok) throw new Error(result.error);

      // 5. Notify parent so EditorShell re-renders canvas with new image.
      onViewsUpdated(updatedViews);
    } catch (err) {
      setError(err instanceof Error ? err.message : EDITOR_INTERNAL_STRINGS.upload_error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={[
          'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border transition-colors',
          uploading
            ? 'border-zinc-200 text-zinc-400 bg-zinc-50 cursor-not-allowed'
            : 'border-zinc-300 text-zinc-600 bg-white hover:bg-zinc-50 hover:border-zinc-400',
        ].join(' ')}
      >
        {uploading ? (
          <>
            <span className="inline-block w-3 h-3 border-2 border-zinc-300 border-t-zinc-500 rounded-full animate-spin" />
            {EDITOR_INTERNAL_STRINGS.uploading}
          </>
        ) : hasImage ? (
          EDITOR_INTERNAL_STRINGS.replace_image
        ) : (
          EDITOR_INTERNAL_STRINGS.upload_image
        )}
      </button>

      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
}
