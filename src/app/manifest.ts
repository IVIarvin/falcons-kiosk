import type { MetadataRoute } from 'next';
import { appName } from '@/lib/brand';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${appName} — Kiosque des Falcons`,
    short_name: appName,
    description: 'Le ravitaillement de la famille Falcons',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#090D0B',
    theme_color: '#090D0B',
    lang: 'fr-CH',
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
