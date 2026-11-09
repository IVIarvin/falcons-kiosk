import type { Metadata, Viewport } from 'next';
import { appName } from '@/lib/brand';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/600.css';
import '@fontsource/rajdhani/700.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import './globals.css';
export const metadata: Metadata = {
  title: `${appName} — kiosque des Falcons`,
  description: 'Le kiosque de la famille Falcons. Boissons, snacks et ardoises.',
  manifest: '/manifest.webmanifest',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: appName, statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/192', apple: '/icons/192' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#090D0B',
  viewportFit: 'cover',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
