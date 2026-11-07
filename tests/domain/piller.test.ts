import { describe, expect, it, vi, afterEach } from 'vitest';
import { quotes, selectQuote } from '@/features/piller/quotes';

afterEach(() => vi.restoreAllMocks());
describe('Adjudant Piller', () => {
  it('possède des identifiants uniques et conserve les anciennes confirmations', () => {
    expect(new Set(quotes.map((q) => q.id)).size).toBe(quotes.length);
    expect(quotes.find((q) => q.id === 'piller-2')?.text).toBe(
      'Achat confirmé. Ta discipline, elle, est toujours portée disparue.',
    );
    expect(quotes.filter((q) => !q.archived).length).toBeGreaterThanOrEqual(60);
  });
  it('ne fait pas de pique sur le sucre ou l’alcool avec une variante sans', () => {
    const lines = [
      {
        product: {
          is_beverage: true,
          details: { kind: 'beer', sugar: 'none', alcohol: 'none', caffeine: 'unknown' },
        },
        quantity: 1,
      },
    ] as const;
    for (let i = 0; i < 100; i++)
      expect(['general', 'sugar-free']).toContain(selectQuote(null, lines).topic);
  });
  it('adapte les répliques au panier et évite la répétition immédiate', () => {
    const lines = [
      {
        product: {
          is_beverage: true,
          details: { kind: 'energy', sugar: 'present', alcohol: 'none', caffeine: 'present' },
        },
        quantity: 1,
      },
    ] as const;
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const first = selectQuote(null, lines);
    expect(first.topic).toBe('energy');
    expect(selectQuote(first.id, lines).id).not.toBe(first.id);
  });
  it('utilise les phrases générales pour un produit non renseigné, sans ressortir les archives', () => {
    for (let i = 0; i < 100; i++) {
      const q = selectQuote();
      expect(q.topic).toBe('general');
      expect(q.archived).not.toBe(true);
    }
  });
});
