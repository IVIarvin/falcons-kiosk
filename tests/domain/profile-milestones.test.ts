import { expect, it } from 'vitest';
import { profileMilestones } from '@/features/profile/milestones';
import type { LedgerEntry } from '@/lib/types';
const entry = (at: string, extra: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id: at,
  kind: 'consumption',
  cents: 100,
  at,
  label: 'Achat',
  voided: false,
  ...extra,
});
it('compte les semaines suisses distinctes sans les achats annulés ou entièrement retirés', () => {
  const entries = [
    entry('2026-11-01T23:30:00Z'),
    entry('2026-11-03T12:00:00Z'),
    entry('2026-11-09T12:00:00Z'),
    entry('2026-11-16T12:00:00Z', { voided: true }),
    entry('2026-11-23T12:00:00Z', {
      lines: [{ id: 'removed', name: 'Eau', quantity: 1, removedQuantity: 1, priceCents: 100 }],
    }),
  ];
  expect(profileMilestones(entries)[0]).toMatchObject({ earned: false, progress: 2, target: 3 });
  expect(profileMilestones([...entries, entry('2026-11-16T14:00:00Z')])[0].earned).toBe(true);
});
it('le premier règlement exige un paiement confirmé non annulé', () => {
  expect(
    profileMilestones([
      entry('2026-11-02', { kind: 'refund' }),
      entry('2026-11-03', { kind: 'payment', voided: true }),
    ])[1].earned,
  ).toBe(false);
  expect(profileMilestones([entry('2026-11-02', { kind: 'payment' })])[1].earned).toBe(true);
});
