import { describe, expect, it } from 'vitest';
import { categoryForProduct, productCategories } from '@/features/catalog/categories';
import { emptyDetails } from '@/features/catalog/details';
import { matchesProductSearch } from '@/features/catalog/browse';

describe('quatre familles du catalogue', () => {
  it('réduit les familles à deux boissons et deux snacks', () => {
    expect(productCategories.map((c) => c.label)).toEqual([
      'Boissons sans alcool',
      'Boissons alcoolisées',
      'Snacks salés',
      'Snacks sucrés',
    ]);
  });
  it('classe une bière 0.0 avec les boissons sans alcool en gardant son type', () => {
    expect(
      categoryForProduct('Bières', { ...emptyDetails(), kind: 'beer', alcohol: 'none' }, true),
    ).toBe('Boissons sans alcool');
  });
  it('ne transforme pas des chips sucrées en snack sucré et laisse les références ambiguës à classer', () => {
    expect(
      categoryForProduct(
        'Snacks salés',
        { ...emptyDetails(), kind: 'snack', sugar: 'present' },
        false,
      ),
    ).toBe('Snacks salés');
    expect(
      categoryForProduct('Snacks', { ...emptyDetails(), kind: 'snack', sugar: 'present' }, false),
    ).toBe('À classer');
  });
});
describe('recherche rapide', () => {
  const product = {
    name: 'Coca-Cola Zéro',
    unit: '33 cl',
    category: 'Boissons sans alcool',
    details: { ...emptyDetails(), kind: 'soda' as const },
  };
  it('tolère accents, espaces et tirets', () => {
    expect(matchesProductSearch(product, 'coca zero')).toBe(true);
    expect(matchesProductSearch(product, 'cocacola')).toBe(true);
    expect(matchesProductSearch(product, '33cl')).toBe(true);
    expect(matchesProductSearch(product, 'cocacola 33cl')).toBe(true);
    expect(matchesProductSearch(product, '  ')).toBe(true);
    expect(matchesProductSearch(product, 'chips')).toBe(false);
  });
});
