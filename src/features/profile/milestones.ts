import type { LedgerEntry } from '@/lib/types';
import { serviceDay } from '@/features/service-tickets/period';
export function profileMilestones(entries: LedgerEntry[]) {
  const weeks = new Set<string>();
  for (const e of entries) {
    if (
      e.kind !== 'consumption' ||
      e.voided ||
      (e.lines ? !e.lines.some((l) => l.quantity > l.removedQuantity) : e.cents <= 0)
    )
      continue;
    const date = new Date(`${serviceDay(new Date(e.at))}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    weeks.add(date.toISOString().slice(0, 10));
  }
  const paid = entries.some((e) => e.kind === 'payment' && !e.voided);
  return [
    {
      id: 'regular',
      label: 'Habitué du poste',
      earned: weeks.size >= 3,
      progress: Math.min(weeks.size, 3),
      target: 3,
      detail: 'Des passages sur 3 semaines différentes.',
    },
    {
      id: 'payment',
      label: 'Premier règlement',
      earned: paid,
      progress: paid ? 1 : 0,
      target: 1,
      detail: 'Un premier paiement confirmé par un admin.',
    },
  ];
}
