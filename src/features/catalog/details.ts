import { z } from 'zod';

export const kindLabels = {
  unknown: 'Non renseigné',
  water: 'Eau',
  soda: 'Soda',
  energy: 'Boisson énergisante',
  coffee: 'Café',
  tea: 'Thé',
  beer: 'Bière',
  wine: 'Vin',
  spirits: 'Spiritueux',
  snack: 'Snack',
  other: 'Autre',
} as const;
export const characteristicLabels = { unknown: 'Inconnu', present: 'Oui', none: 'Non' } as const;
export const detailsSchema = z.object({
  kind: z
    .enum([
      'unknown',
      'water',
      'soda',
      'energy',
      'coffee',
      'tea',
      'beer',
      'wine',
      'spirits',
      'snack',
      'other',
    ])
    .default('unknown'),
  sugar: z.enum(['unknown', 'present', 'none']).default('unknown'),
  alcohol: z.enum(['unknown', 'present', 'none']).default('unknown'),
  caffeine: z.enum(['unknown', 'present', 'none']).default('unknown'),
  sugarsPer100: z.number().min(0).max(100).nullable().default(null),
  alcoholPercent: z.number().min(0).max(100).nullable().default(null),
  source: z
    .object({ code: z.string().regex(/^\d{8,14}$/), image: z.string().max(1000) })
    .nullable()
    .default(null),
});
export type ProductDetails = z.infer<typeof detailsSchema>;
export function emptyDetails(): ProductDetails {
  return detailsSchema.parse({});
}
export function productSourceUrl(code: string) {
  return `https://world.openfoodfacts.org/product/${code}`;
}
export type ProductSuggestion = {
  code: string;
  name: string;
  brand: string;
  unit: string;
  category: string;
  is_beverage: boolean;
  image: string;
  details: ProductDetails;
};
