import { assert } from './errors';
export const formatCHF = (cents: number) =>
  `CHF ${(cents / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export function priceFromCost(
  costMicros: number,
  markupBasisPoints: number,
  incrementCents = 5,
): number {
  assert(
    Number.isSafeInteger(costMicros) &&
      costMicros >= 0 &&
      Number.isSafeInteger(markupBasisPoints) &&
      markupBasisPoints >= 0,
    'Coût ou majoration invalide.',
  );
  const numerator = BigInt(costMicros) * BigInt(10000 + markupBasisPoints);
  const step = BigInt(incrementCents) * 10000n * 10000n;
  return Number((numerator + step / 2n) / step) * incrementCents;
}
export function centsFromInput(value: string): number {
  const normalized = value.trim().replace(',', '.');
  assert(
    /^\d+(\.\d{1,2})?$/.test(normalized),
    'Saisis un montant positif avec deux décimales au maximum.',
  );
  const [whole, fraction = ''] = normalized.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  assert(Number.isSafeInteger(result) && result <= 100000000, 'Montant trop élevé.');
  return result;
}
export function costMicrosFromInput(value: string): number {
  const normalized = value.trim().replace(',', '.');
  assert(/^\d+(\.\d{1,6})?$/.test(normalized), 'Le coût doit avoir au plus six décimales.');
  const [whole, fraction = ''] = normalized.split('.');
  const result = Number(whole) * 1000000 + Number(fraction.padEnd(6, '0'));
  assert(Number.isSafeInteger(result) && result <= 1000000000000, 'Coût trop élevé.');
  return result;
}
