'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

type CarouselImage = { url: string; alt: string };

type Props = {
  images: CarouselImage[];
  intervalMs?: number;
};

// No auto-advance/cross-fade exists in ImageGallery (that's a static
// click-through gallery) — this is a new, minimal carousel: cross-fades
// through a fixed, pre-shuffled image pool on a timer. No pixel-fixed
// sizing; fills whatever space its container grid column gives it.
export default function FeaturedCarousel({ images, intervalMs = 4500 }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [images.length, intervalMs]);

  if (images.length === 0) return null;

  return (
    <div className="relative w-full h-full min-h-60 overflow-hidden bg-zinc-100 rounded-lg">
      {images.map((img, i) => (
        <Image
          key={i}
          src={img.url}
          alt={img.alt}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          priority={i === 0}
          className={[
            'object-cover transition-opacity duration-1000 ease-in-out',
            i === activeIdx ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        />
      ))}
    </div>
  );
}
