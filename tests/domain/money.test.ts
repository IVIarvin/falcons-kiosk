import { expect, it } from 'vitest';
import { priceFromCost, formatCHF } from '@/lib/money';
it('applique 30% puis arrondit au cinq centimes, égalité vers le haut', () => {
  expect(priceFromCost(1_000_000, 3000)).toBe(130);
  expect(priceFromCost(1_025_000, 0)).toBe(105);
  expect(priceFromCost(1_024_999, 0)).toBe(100);
  expect(formatCHF(250)).toContain('2.50');
  expect(() => priceFromCost(-1, 0)).toThrow();
});
