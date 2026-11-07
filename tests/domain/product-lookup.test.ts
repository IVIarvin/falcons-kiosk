import { describe, expect, it } from 'vitest';
import { normalizeProduct } from '@/features/catalog/lookup';

describe('normalisation des références Open Food Facts', () => {
  it('ne classe pas automatiquement comme alcoolisée une référence explicitement sans alcool à teneur résiduelle', () => {
    const beer = normalizeProduct({
      code: '12345678',
      product_name: 'Bière sans alcool',
      categories_tags: ['en:beers', 'en:non-alcoholic-beers'],
      nutriments: { alcohol_100g: 0.5 },
    });
    expect(beer?.details.alcoholPercent).toBe(0.5);
    expect(beer?.details.alcohol).toBe('unknown');
  });
  it('ne déduit pas les caractéristiques du nom ni des valeurs absentes', () => {
    const product = normalizeProduct({ code: '12345678', product_name: 'Coca Zero bière café' });
    expect(product?.details).toMatchObject({
      kind: 'unknown',
      sugar: 'unknown',
      alcohol: 'unknown',
      caffeine: 'unknown',
    });
    expect(product?.image).toBe('');
  });
  it('distingue le sucre, les variantes sans alcool et la caféine absente', () => {
    const beer = normalizeProduct({
      code: '12345678',
      product_name: 'Bière 0.0',
      categories_tags: ['en:beverages', 'en:beers', 'en:non-alcoholic-beers'],
      nutriments: { alcohol_100g: 0, sugars_100g: 2 },
    });
    expect(beer?.details).toMatchObject({
      kind: 'beer',
      alcohol: 'none',
      sugar: 'present',
      caffeine: 'unknown',
    });
    const zero = normalizeProduct({
      code: '12345679',
      product_name: 'Cola',
      categories_tags: ['en:sodas'],
      nutriments: { sugars_100g: 0, caffeine_100g: 0 },
    });
    expect(zero?.details).toMatchObject({
      kind: 'soda',
      sugar: 'none',
      caffeine: 'none',
      alcohol: 'unknown',
    });
  });
  it('récupère une photo sélectionnée dans la recherche et garde la provenance', () => {
    const product = normalizeProduct({
      code: '5449000000996',
      product_name: { fr: 'Coca-Cola', en: 'Coke' },
      quantity: '330 ml',
      brands: ['Coca-Cola'],
      images: { front_fr: { rev: '123', sizes: { 400: { w: 100, h: 400 } } } },
    });
    expect(product?.name).toBe('Coca-Cola');
    expect(product?.image).toBe(
      'https://images.openfoodfacts.org/images/products/544/900/000/0996/front_fr.123.400.jpg',
    );
    expect(product?.details.source?.code).toBe('5449000000996');
  });
  it('ignore les champs malformés et les URL étrangères aux images du fournisseur', () => {
    expect(normalizeProduct({ code: 'not-a-code', product_name: 'Produit' })).toBeNull();
    const product = normalizeProduct({
      code: '12345678',
      product_name: 'Produit',
      image_front_url: 'https://evil.example/image.jpg',
      categories_tags: 'beer',
      nutriments: { sugars_100g: '', alcohol_100g: -2 },
    });
    expect(product?.image).toBe('');
    expect(product?.details.sugar).toBe('unknown');
    expect(product?.details.alcohol).toBe('unknown');
  });
});
