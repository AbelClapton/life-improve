import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mi Día',
    short_name: 'Mi Día',
    description: 'Organización personal diaria.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f5f2eb',
    theme_color: '#6366f1',
    icons: [
      { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}