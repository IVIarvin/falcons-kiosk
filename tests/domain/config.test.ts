import { expect, it } from 'vitest';
import { canonicalUrl } from '@/lib/config';

it('génère l’affiche depuis une adresse stable, jamais depuis une preview', () => {
  expect(canonicalUrl({ PUBLIC_APP_URL: 'https://kiosque.example.org/app' })).toBe(
    'https://kiosque.example.org/app',
  );
  expect(
    canonicalUrl({
      VERCEL_PROJECT_PRODUCTION_URL: 'falcons.example.org',
      VERCEL_URL: 'preview.example.org',
    }),
  ).toBe('https://falcons.example.org/');
  expect(canonicalUrl({ VERCEL_URL: 'preview.example.org' })).toBe('');
  for (const value of [
    'http://localhost:3010',
    'https://name:secret@example.org',
    'https://example.org/?token=secret',
    'https://example.org/#private',
  ]) {
    expect(canonicalUrl({ PUBLIC_APP_URL: value })).toBe('');
  }
});
