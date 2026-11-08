import { z } from 'zod';
import type { Database } from '@/lib/db';
import { DomainError } from '@/lib/errors';
import { requireAdmin, type Member } from '@/features/auth/service';
import { emptyDetails, type ProductSuggestion, type ProductDetails } from './details';
import { categoryForProduct } from './categories';

const fields =
  'code,product_name,product_name_fr,product_name_en,brands,quantity,categories_tags,labels_tags,nutriments,image_front_url,images,lang';
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const string = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const tags = (value: unknown) =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
function number(value: unknown, max: number) {
  if (typeof value !== 'number' && !(typeof value === 'string' && value.trim())) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
}
function imageFor(raw: Record<string, unknown>, code: string) {
  const direct = string(raw.image_front_url);
  if (/^https:\/\/images\.openfoodfacts\.org\//.test(direct)) return direct;
  const images = object(raw.images);
  const selected = [
    'front_fr',
    `front_${string(raw.lang)}`,
    'front_en',
    ...Object.keys(images).filter((k) => /^front_[a-z]{2}$/.test(k)),
  ].find((k) => /^front_[a-z]{2}$/.test(k) && /^\d+$/.test(String(object(images[k]).rev ?? '')));
  if (!selected) return '';
  const path =
    code.length > 8
      ? `${code.slice(0, 3)}/${code.slice(3, 6)}/${code.slice(6, 9)}/${code.slice(9)}`
      : code;
  return `https://images.openfoodfacts.org/images/products/${path}/${selected}.${object(images[selected]).rev}.400.jpg`;
}
export function normalizeProduct(value: unknown): ProductSuggestion | null {
  const raw = object(value),
    code = string(raw.code);
  if (!/^\d{8,14}$/.test(code)) return null;
  const names = object(raw.product_name);
  const name =
    string(raw.product_name_fr) ||
    string(names.fr) ||
    string(raw.product_name) ||
    string(names.en) ||
    string(raw.product_name_en);
  if (!name) return null;
  const categories = tags(raw.categories_tags),
    labels = tags(raw.labels_tags),
    n = object(raw.nutriments);
  const has = (...values: string[]) => values.some((v) => categories.includes(`en:${v}`));
  const details = emptyDetails();
  const kinds: [ProductDetails['kind'], string[]][] = [
    ['energy', ['energy-drinks']],
    ['beer', ['beers', 'non-alcoholic-beers', 'alcohol-free-beers']],
    ['wine', ['wines']],
    ['spirits', ['spirits', 'liqueurs']],
    ['water', ['waters', 'mineral-waters', 'spring-waters']],
    ['coffee', ['coffees', 'coffee-drinks', 'iced-coffees']],
    ['tea', ['teas', 'iced-teas', 'tea-based-beverages']],
    ['soda', ['sodas', 'colas', 'carbonated-drinks']],
    [
      'snack',
      ['snacks', 'salty-snacks', 'sweet-snacks', 'chips', 'crisps', 'chocolates', 'biscuits'],
    ],
  ];
  details.kind = kinds.find(([, values]) => has(...values))?.[0] ?? 'unknown';
  details.sugarsPer100 = number(n.sugars_100g, 100);
  details.alcoholPercent = number(n.alcohol_100g ?? n.alcohol, 100);
  const caffeine = number(n.caffeine_100g, 100);
  details.sugar =
    details.sugarsPer100 === null
      ? labels.includes('en:sugar-free')
        ? 'none'
        : 'unknown'
      : details.sugarsPer100 > 0
        ? 'present'
        : 'none';
  details.alcohol =
    details.alcoholPercent === null
      ? has('non-alcoholic-beverages', 'non-alcoholic-beers', 'alcohol-free-beers') ||
        labels.includes('en:alcohol-free')
        ? 'none'
        : has('alcoholic-beverages', 'beers', 'wines', 'spirits', 'liqueurs')
          ? 'present'
          : 'unknown'
      : details.alcoholPercent > 0
        ? 'present'
        : 'none';
  // A residual percentage and an alcohol-free label need human verification.
  if (
    details.alcohol === 'present' &&
    (has('non-alcoholic-beverages', 'non-alcoholic-beers', 'alcohol-free-beers') ||
      labels.includes('en:alcohol-free'))
  )
    details.alcohol = 'unknown';
  details.caffeine =
    caffeine === null
      ? labels.includes('en:caffeine-free') || labels.includes('en:decaffeinated')
        ? 'none'
        : 'unknown'
      : caffeine > 0
        ? 'present'
        : 'none';
  const image = imageFor(raw, code);
  details.source = { code, image };
  const isBeverage =
    has('beverages', 'non-alcoholic-beverages', 'alcoholic-beverages') ||
    ['water', 'soda', 'energy', 'coffee', 'tea', 'beer', 'wine', 'spirits'].includes(details.kind);
  const category =
    details.kind === 'snack'
      ? has('salty-snacks', 'chips', 'crisps', 'salted-biscuits', 'crackers')
        ? 'Snacks salés'
        : has('sweet-snacks', 'chocolates', 'biscuits', 'candies', 'confectioneries')
          ? 'Snacks sucrés'
          : 'Snacks'
      : isBeverage
        ? 'Boissons'
        : 'Autres';
  return {
    code,
    name: name.slice(0, 90),
    brand: (Array.isArray(raw.brands) ? tags(raw.brands).join(', ') : string(raw.brands)).slice(
      0,
      120,
    ),
    unit: string(raw.quantity).slice(0, 40),
    category: categoryForProduct(category, details, isBeverage),
    is_beverage: isBeverage,
    image,
    details,
  };
}

function unavailable() {
  return new DomainError(
    'La recherche produit est indisponible. Réessaie ou continue en saisie libre.',
    'LOOKUP_UNAVAILABLE',
    503,
  );
}
async function cached<T>(
  db: Database,
  key: string,
  kind: 'search' | 'product',
  url: URL,
  fetcher: typeof fetch,
  parse: (data: unknown) => T,
): Promise<T> {
  const [hit] = await db.query<{ payload: T }>(
    'SELECT payload FROM product_lookup_cache WHERE key=$1 AND expires_at>now()',
    [key],
  );
  if (hit) return hit.payload;
  await db.transaction(async (tx) => {
    await tx.query(
      'INSERT INTO product_lookup_limits(kind,next_allowed_at) VALUES($1,0) ON CONFLICT DO NOTHING',
      [kind],
    );
    const [limit] = await tx.query<{ next_allowed_at: string }>(
      'SELECT next_allowed_at FROM product_lookup_limits WHERE kind=$1 FOR UPDATE',
      [kind],
    );
    if (Number(limit.next_allowed_at) > Date.now())
      throw new DomainError(
        'Patiente quelques secondes avant une autre recherche, ou continue en saisie libre.',
        'LOOKUP_LIMIT',
        429,
      );
    await tx.query('UPDATE product_lookup_limits SET next_allowed_at=$2 WHERE kind=$1', [
      kind,
      Date.now() + (kind === 'search' ? 6500 : 4500),
    ]);
  });
  let result: T;
  try {
    const response = await fetcher(url, {
      headers: {
        'User-Agent': 'FalconsKiosk/0.1 (product catalogue; https://world.openfoodfacts.org)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'error',
      cache: 'no-store',
    });
    if (response.status === 404 && kind === 'product')
      throw new DomainError(
        'Cette référence est introuvable. Continue en saisie libre.',
        'PRODUCT_NOT_FOUND',
        404,
      );
    if (!response.ok) throw unavailable();
    result = parse(await response.json());
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw unavailable();
  }
  await db.query('DELETE FROM product_lookup_cache WHERE expires_at<now()');
  await db.query(
    'INSERT INTO product_lookup_cache(key,payload,expires_at) VALUES($1,$2,$3) ON CONFLICT(key) DO UPDATE SET payload=EXCLUDED.payload,expires_at=EXCLUDED.expires_at',
    [key, JSON.stringify(result), new Date(Date.now() + 86400000).toISOString()],
  );
  return result;
}
export async function searchProducts(
  db: Database,
  actor: Member,
  input: unknown,
  fetcher: typeof fetch = fetch,
): Promise<ProductSuggestion[]> {
  requireAdmin(actor);
  const { query } = z.object({ query: z.string().trim().min(2).max(90) }).parse(input);
  const compact = query.replace(/[\s-]/g, '');
  if (/^\d{8,14}$/.test(compact)) {
    try {
      return [await lookupProduct(db, actor, { code: compact }, fetcher)];
    } catch (error) {
      if (error instanceof DomainError && error.code === 'PRODUCT_NOT_FOUND') return [];
      throw error;
    }
  }
  const url = new URL('https://search.openfoodfacts.org/search');
  url.search = new URLSearchParams({
    q: query.replace(/[+\-!():^\[\]"{}~*?\\/|&<>]/g, ' '),
    page_size: '8',
    langs: 'fr,en',
    fields,
  }).toString();
  return cached(
    db,
    `v2:search:${query.toLocaleLowerCase('fr')}`,
    'search',
    url,
    fetcher,
    (data) => {
      const raw = object(data);
      if (!Array.isArray(raw.hits) || raw.timed_out === true) throw unavailable();
      return raw.hits
        .slice(0, 8)
        .map(normalizeProduct)
        .filter((p): p is ProductSuggestion => p !== null);
    },
  );
}
export async function lookupProduct(
  db: Database,
  actor: Member,
  input: unknown,
  fetcher: typeof fetch = fetch,
): Promise<ProductSuggestion> {
  requireAdmin(actor);
  const { code } = z.object({ code: z.string().regex(/^\d{8,14}$/) }).parse(input);
  const url = new URL(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
  url.searchParams.set('fields', fields);
  return cached(db, `v2:product:${code}`, 'product', url, fetcher, (data) => {
    const raw = object(data);
    if (raw.status === 0)
      throw new DomainError(
        'Cette référence est introuvable. Continue en saisie libre.',
        'PRODUCT_NOT_FOUND',
        404,
      );
    const product = normalizeProduct(raw.product);
    if (!product) throw unavailable();
    return product;
  });
}
