import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tri 70.3',
    short_name: 'Tri 70.3',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#1A1A1C',
    theme_color: '#1A1A1C',
    lang: 'nb',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
