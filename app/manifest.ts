import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mi Día',
    short_name: 'Mi Día',
    description: 'Organización personal diaria.',
    start_url: '/es',
    display: 'standalone',
    background_color: '#f5f2eb',
    theme_color: '#6366f1',
    icons: [
      { src: '/icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}