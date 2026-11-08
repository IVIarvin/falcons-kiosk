import type { ProductDetails } from './details';

export const productCategories: {
  label: string;
  kind: ProductDetails['kind'];
  beverage: boolean;
}[] = [
  { label: 'Eaux', kind: 'water', beverage: true },
  { label: 'Sodas', kind: 'soda', beverage: true },
  { label: 'Boissons énergisantes', kind: 'energy', beverage: true },
  { label: 'Cafés', kind: 'coffee', beverage: true },
  { label: 'Thés', kind: 'tea', beverage: true },
  { label: 'Bières', kind: 'beer', beverage: true },
  { label: 'Vins', kind: 'wine', beverage: true },
  { label: 'Spiritueux', kind: 'spirits', beverage: true },
  { label: 'Autres boissons', kind: 'other', beverage: true },
  { label: 'Snacks', kind: 'snack', beverage: false },
  { label: 'Autres', kind: 'other', beverage: false },
];
export function categoryForProduct(
  category: string,
  kind: ProductDetails['kind'],
  beverage: boolean,
) {
  if (productCategories.some((c) => c.label === category)) return category;
  return (
    productCategories.find((c) => c.kind === kind && c.beverage === beverage)?.label ??
    (beverage ? 'Autres boissons' : 'Autres')
  );
}
