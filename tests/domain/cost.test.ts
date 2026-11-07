import { expect, it } from 'vitest';
import { costMicrosFromInput } from '@/lib/money';
it('conserve la précision des coûts unitaires issus de lots', () => {
  expect(costMicrosFromInput('1,234567')).toBe(1234567);
  expect(costMicrosFromInput('0')).toBe(0);
  expect(() => costMicrosFromInput('-1')).toThrow();
});
