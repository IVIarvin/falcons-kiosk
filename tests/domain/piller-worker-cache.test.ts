import { expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const audio = `http://localhost/audio/piller/${'a'.repeat(64)}/${'b'.repeat(64)}.mp3`;
async function worker(response: Response, cacheError = false, range = false) {
  let fetchHandler!: (event: unknown) => void;
  let result: Promise<Response> | undefined;
  const put = vi.fn(async (_request: unknown, value: Response) => {
    if (cacheError || value.status === 206) throw new TypeError('Cache write rejected');
  });
  const fetcher = vi.fn(async () => response);
  const cache = { match: async () => undefined, put };
  vm.runInNewContext(await readFile('public/sw.js', 'utf8'), {
    self: {
      location: { origin: 'http://localhost' },
      addEventListener: (name: string, handler: typeof fetchHandler) => {
        if (name === 'fetch') fetchHandler = handler;
      },
    },
    caches: { open: async () => cache },
    fetch: fetcher,
    URL,
  });
  fetchHandler({
    request: new Request(audio, { headers: range ? { Range: 'bytes=0-31' } : {} }),
    respondWith: (p: Promise<Response>) => (result = p),
  });
  return { response: await (result ?? fetcher()), put };
}
it('la lecture partielle 206 et les Range restent lisibles sans cache', async () => {
  for (const range of [false, true]) {
    const result = await worker(
      new Response('partial', { status: 206, headers: { 'Content-Type': 'audio/mpeg' } }),
      false,
      range,
    );
    expect(result.response.status).toBe(206);
    expect(result.put).not.toHaveBeenCalled();
  }
});
it('une saturation du cache ne bloque pas le MP3 reçu', async () => {
  const result = await worker(
    new Response('complete', { headers: { 'Content-Type': 'audio/mpeg' } }),
    true,
  );
  expect(await result.response.text()).toBe('complete');
});
