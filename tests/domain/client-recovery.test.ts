import { afterEach, expect, it, vi } from 'vitest';
import { durableAction, pendingAction } from '@/lib/client';
afterEach(() => vi.unstubAllGlobals());
function storage() {
  const data = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  });
}
it.each([401, 403, 408, 429])(
  'conserve la confirmation incertaine après HTTP %i',
  async (status) => {
    storage();
    const committed = new Set<string>();
    let attempt = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, options) => {
        const body = JSON.parse(options.body);
        if (++attempt === 1) {
          committed.add(body.data.idempotencyKey);
          throw new TypeError('réponse perdue');
        }
        if (attempt === 2)
          return Response.json(
            {
              ok: false,
              code: status === 401 ? 'AUTH' : 'FORBIDDEN',
              message: 'Reconnexion requise',
            },
            { status },
          );
        committed.add(body.data.idempotencyKey);
        return Response.json({ ok: true, data: { id: 'same-operation' } });
      }),
    );
    await expect(
      durableAction('checkout', 'member', { lines: [{ productId: 'water', quantity: 1 }] }),
    ).rejects.toThrow();
    const original = pendingAction('checkout', 'member')!.idempotencyKey;
    await expect(durableAction('checkout', 'member')).rejects.toThrow();
    expect(pendingAction('checkout', 'member')?.idempotencyKey).toBe(original);
    await expect(durableAction('checkout', 'member')).resolves.toEqual({ id: 'same-operation' });
    expect(committed.size).toBe(1);
    expect(pendingAction('checkout', 'member')).toBeNull();
  },
);
it('libère un panier dont le prix a été définitivement refusé', async () => {
  storage();
  vi.stubGlobal('fetch', async () =>
    Response.json({ ok: false, code: 'PRICE_CHANGED', message: 'Prix changé' }, { status: 409 }),
  );
  await expect(durableAction('checkout', 'member', { lines: [] })).rejects.toThrow('Prix changé');
  expect(pendingAction('checkout', 'member')).toBeNull();
});
