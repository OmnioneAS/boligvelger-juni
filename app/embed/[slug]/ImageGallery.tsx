'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { ApartmentImage } from '@/lib/types';

type Props = {
  images: ApartmentImage[];
};

export default function ImageGallery({ images }: Props) {
  const sorted = [...images].sort((a, b) => a.order - b.order);
  const [activeIdx, setActiveIdx] = useState(0);

  // Keyboard navigation
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setActiveIdx((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setActiveIdx((i) => Math.min(sorted.length - 1, i + 1));
    },
    [sorted.length],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (sorted.length === 0) return null;

  const active = sorted[activeIdx];

  return (
    <div className="flex flex-col gap-2">
      {/* Main image */}
      <div className="relative w-full h-72 bg-zinc-100 rounded-lg overflow-hidden">
        <Image
          src={active.url}
          alt={active.alt}
          fill
          sizes="(min-width: 640px) 32rem, 100vw"
          className="object-contain"
        />
        {active.caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs px-3 py-1.5">
            {active.caption}
          </div>
        )}
      </div>

      {/* Thumbnail row */}
      {sorted.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {sorted.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={[
                'relative shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition-colors',
                i === activeIdx ? 'border-blue-500' : 'border-transparent hover:border-zinc-300',
              ].join(' ')}
            >
              <Image src={img.url} alt={img.alt} fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
