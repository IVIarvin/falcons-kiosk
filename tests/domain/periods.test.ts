import { expect, it } from 'vitest';
import { weekBoundsZurich, rankEntries } from '@/features/achievements/service';
it('délimite le lundi local et une semaine de passage à l’heure d’été', () => {
  const bounds = weekBoundsZurich(new Date('2026-03-29T15:00:00Z'));
  expect(bounds.start.toISOString()).toBe('2026-03-22T23:00:00.000Z');
  expect(bounds.end.toISOString()).toBe('2026-03-29T22:00:00.000Z');
  expect((bounds.end.getTime() - bounds.start.getTime()) / 3600000).toBe(167);
  expect(weekBoundsZurich(new Date('2026-03-29T22:00:00Z')).start.toISOString()).toBe(
    '2026-03-29T22:00:00.000Z',
  );
});
it('délimite correctement une semaine de passage à l’heure d’hiver', () => {
  const b = weekBoundsZurich(new Date('2026-10-25T12:00:00Z'));
  expect((b.end.getTime() - b.start.getTime()) / 3600000).toBe(169);
});
it('partage les rangs ex æquo et exclut les scores nuls', () => {
  const r = rankEntries([
    { id: 'a', name: 'A', grade: 'Sdt', score: 3 },
    { id: 'b', name: 'B', grade: 'Sdt', score: 3 },
    { id: 'c', name: 'C', grade: 'Sdt', score: 1 },
    { id: 'd', name: 'D', grade: 'Sdt', score: 0 },
  ]);
  expect(r.map((x) => x.rank)).toEqual([1, 1, 3]);
  expect(rankEntries([])).toEqual([]);
});
