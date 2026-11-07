import type { Database } from '@/lib/db';
import type { Member } from '@/features/auth/service';
export type RankEntry = { id: string; name: string; grade: string; score: number; rank: number };
export type Badge = {
  type: 'first' | 'drinks' | 'contributor';
  label: string;
  period: string | null;
};
const zone = 'Europe/Zurich';
function parts(date: Date) {
  const entries = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(
    entries.filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]),
  );
}
function midnight(localUtc: number) {
  let guess = localUtc;
  for (let i = 0; i < 3; i++) {
    const p = parts(new Date(guess));
    const rendered = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess = localUtc - (rendered - guess);
  }
  return new Date(guess);
}
export function weekBoundsZurich(date: Date) {
  const p = parts(date);
  const local = Date.UTC(p.year, p.month - 1, p.day);
  const weekday = new Date(local).getUTCDay();
  const monday = local - ((weekday + 6) % 7) * 86400000;
  return { start: midnight(monday), end: midnight(monday + 7 * 86400000) };
}
export function rankEntries(rows: Omit<RankEntry, 'rank'>[]): RankEntry[] {
  const sorted = rows
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  let rank = 0;
  return sorted.map((r, i) => {
    if (i === 0 || r.score !== sorted[i - 1].score) rank = i + 1;
    return { ...r, rank };
  });
}
export type Community = {
  drinks: RankEntry[];
  contributors: RankEntry[];
  allTime: RankEntry[];
  badges: Badge[];
  weekStart: string;
  weekEnd: string;
};
export async function getCommunity(
  db: Database,
  user: Member,
  date = new Date(),
): Promise<Community> {
  const { start, end } = weekBoundsZurich(date);
  const rows = await db.query<{
    id: string;
    name: string;
    grade: string;
    amount: string;
    drinks: string;
    week: string;
  }>(
    `SELECT u.id,u.name,u.grade,COALESCE(sum(l.quantity*l.price_cents),0) AS amount,COALESCE(sum(CASE WHEN l.is_beverage THEN l.quantity ELSE 0 END),0) AS drinks,date_trunc('week',c.created_at AT TIME ZONE 'Europe/Zurich')::date::text AS week FROM consumption_lines l JOIN consumptions c ON c.id=l.consumption_id JOIN users u ON u.id=c.user_id WHERE c.reversed_at IS NULL GROUP BY u.id,u.name,u.grade,week`,
  );
  const localParts = parts(start);
  const weekKey = `${localParts.year}-${String(localParts.month).padStart(2, '0')}-${String(localParts.day).padStart(2, '0')}`;
  const weekly = rows.filter((r) => r.week === weekKey);
  const rank = (source: typeof rows, metric: 'drinks' | 'amount') =>
    rankEntries(
      source.map((r) => ({ id: r.id, name: r.name, grade: r.grade, score: Number(r[metric]) })),
    );
  const totals = new Map<string, { id: string; name: string; grade: string; score: number }>();
  for (const r of rows) {
    const current = totals.get(r.id);
    totals.set(r.id, {
      id: r.id,
      name: r.name,
      grade: r.grade,
      score: (current?.score ?? 0) + Number(r.amount),
    });
  }
  const badges: Badge[] = rows.some((r) => r.id === user.id)
    ? [{ type: 'first', label: 'Premier ravitaillement', period: null }]
    : [];
  for (const period of [...new Set(rows.map((r) => r.week))].sort().reverse()) {
    if (period >= weekKey) continue;
    const historical = rows.filter((r) => r.week === period);
    if (rank(historical, 'drinks').some((r) => r.id === user.id && r.rank === 1))
      badges.push({ type: 'drinks', label: 'Faucon assoiffé', period });
    if (rank(historical, 'amount').some((r) => r.id === user.id && r.rank === 1))
      badges.push({ type: 'contributor', label: 'Pilier du nid', period });
  }
  return {
    drinks: rank(weekly, 'drinks'),
    contributors: rank(weekly, 'amount'),
    allTime: rankEntries([...totals.values()]),
    badges,
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
  };
}
