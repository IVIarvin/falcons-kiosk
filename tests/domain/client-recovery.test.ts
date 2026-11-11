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
it.each(['success', 'invalid'] as const)(
  'une ancienne réponse %s ne doit pas effacer une nouvelle opération après reprise',
  async (oldResponse) => {
    storage();
    let finishOld!: (response: Response) => void;
    let rejectNew!: (error: Error) => void;
    let attempt = 0;
    vi.stubGlobal('fetch', async () => {
      attempt++;
      if (attempt === 1)
        return new Promise<Response>((resolve) => {
          finishOld = resolve;
        });
      if (attempt === 2) return Response.json({ ok: true, data: { id: 'ticket-one' } });
      if (attempt === 3)
        return new Promise<Response>((_, reject) => {
          rejectNew = reject;
        });
      return Response.json({ ok: true, data: { id: 'ticket-two' } });
    });
    const original = durableAction('recordServiceTicket', 'admin', {
      memberId: 'one',
      productId: 'beer',
    }).catch((e) => e);
    await durableAction('recordServiceTicket', 'admin');
    const next = durableAction('recordServiceTicket', 'admin', {
      memberId: 'two',
      productId: 'beer',
    });
    const nextKey = pendingAction('recordServiceTicket', 'admin')!.idempotencyKey;
    finishOld(
      oldResponse === 'success'
        ? Response.json({ ok: true, data: { id: 'ticket-one' } })
        : Response.json(
            { ok: false, code: 'INVALID', message: 'Ancienne opération refusée' },
            { status: 400 },
          ),
    );
    await original;
    expect(pendingAction('recordServiceTicket', 'admin')?.idempotencyKey).toBe(nextKey);
    rejectNew(new Error('réponse perdue'));
    await expect(next).rejects.toThrow();
    expect(pendingAction('recordServiceTicket', 'admin')?.idempotencyKey).toBe(nextKey);
    await expect(durableAction('recordServiceTicket', 'admin')).resolves.toEqual({
      id: 'ticket-two',
    });
  },
);
