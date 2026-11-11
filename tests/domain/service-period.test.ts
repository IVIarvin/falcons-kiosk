import { expect, it } from 'vitest';
import { serviceDay } from '@/features/service-tickets/period';
it('calcule le jour local à Zurich, aussi lors des changements d’heure', () => {
  expect(serviceDay(new Date('2026-11-10T23:05:00Z'))).toBe('2026-11-11');
  expect(serviceDay(new Date('2026-07-10T22:05:00Z'))).toBe('2026-07-11');
  expect(serviceDay(new Date('2026-03-28T23:00:00Z'))).toBe('2026-03-29');
  expect(serviceDay(new Date('2026-10-24T22:00:00Z'))).toBe('2026-10-25');
});
