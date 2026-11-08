import { emptyDetails, type ProductDetails } from './details';
export const unclassifiedCategory = 'À classer';
export const productCategories = [
  { label: 'Boissons sans alcool', shortLabel: 'Sans alcool', beverage: true, alcohol: 'none' },
  { label: 'Boissons alcoolisées', shortLabel: 'Alcool', beverage: true, alcohol: 'present' },
  { label: 'Snacks salés', shortLabel: 'Salé', beverage: false, alcohol: null },
  { label: 'Snacks sucrés', shortLabel: 'Sucré', beverage: false, alcohol: null },
] as const;
export const legacyKinds: Record<string, ProductDetails['kind']> = {
  Eaux: 'water',
  Sodas: 'soda',
  'Boissons énergisantes': 'energy',
  Cafés: 'coffee',
  Thés: 'tea',
  Bières: 'beer',
  Vins: 'wine',
  Spiritueux: 'spirits',
  Snacks: 'snack',
};
export function categoryForProduct(category: string, details: ProductDetails, beverage: boolean) {
  if (productCategories.some((c) => c.label === category)) return category;
  if (/^(snacks? sucrés?|chocolats?|confiseries|biscuits)$/i.test(category)) return 'Snacks sucrés';
  if (/^(snacks? salés?|chips|biscuits apéritifs)$/i.test(category)) return 'Snacks salés';
  const kind = details.kind === 'unknown' ? (legacyKinds[category] ?? 'unknown') : details.kind;
  if (
    beverage ||
    ['water', 'soda', 'energy', 'coffee', 'tea', 'beer', 'wine', 'spirits'].includes(kind)
  ) {
    if (details.alcohol === 'present') return 'Boissons alcoolisées';
    if (details.alcohol === 'none' || ['water', 'soda', 'energy', 'coffee', 'tea'].includes(kind))
      return 'Boissons sans alcool';
  }
  return unclassifiedCategory;
}
export function classifyDetails(category: string, input?: ProductDetails): ProductDetails {
  const details = { ...(input ?? emptyDetails()) };
  if (details.kind === 'unknown' && legacyKinds[category]) details.kind = legacyKinds[category];
  const family = productCategories.find((c) => c.label === category);
  if (!family) return details;
  if (!family.beverage) details.kind = 'snack';
  else {
    if (details.kind === 'snack') details.kind = 'unknown';
    if (details.alcohol !== family.alcohol) details.alcoholPercent = null;
    details.alcohol = family.alcohol;
  }
  return details;
}
