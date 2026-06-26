import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage (will be set to actual project URL in production)
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Picsum Photos — used for the seed test project placeholder image
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      // Unsplash — in case customers link Unsplash images directly
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
