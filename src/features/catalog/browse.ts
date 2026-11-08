import { kindLabels } from './details';
import type { Product } from '@/lib/types';
const normalized = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
export function matchesProductSearch(
  product: Pick<Product, 'name' | 'unit' | 'category' | 'details'>,
  query: string,
) {
  const search = normalized(query);
  if (!search) return true;
  const haystack = normalized(
    [
      product.name,
      product.unit,
      product.category,
      kindLabels[product.details.kind],
      product.details.source?.code ?? '',
    ].join(' '),
  );
  const compact = haystack.replaceAll(' ', '');
  return search.split(/\s+/).every((word) => haystack.includes(word) || compact.includes(word));
}
