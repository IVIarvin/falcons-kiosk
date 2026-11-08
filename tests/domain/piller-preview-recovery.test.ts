import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { prepareVoicePreviews, selectVoicePreview } from '@/features/piller/voice-previews';
import { atomicWrite } from '@/features/piller/voice-build';
const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});
async function root() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'falcons-preview-'));
  dirs.push(dir);
  return dir;
}
function provider(prefix: string) {
  return vi.fn(async (url: RequestInfo | URL) => {
    if (new URL(String(url)).pathname.endsWith('/design'))
      return Response.json({
        text: 'Preview',
        previews: [1, 2, 3].map((i) => ({
          generated_voice_id: `${prefix}_${i}`,
          audio_base_64: Buffer.from([
            73,
            68,
            51,
            ...new Array(40).fill(prefix === 'old' ? 1 : 2),
          ]).toString('base64'),
          media_type: 'audio/mpeg',
          duration_secs: 3,
        })),
      });
    return Response.json({ voice_id: 'created_voice' });
  });
}
it('une interruption ne remplace pas les sons associés à l’ancien index et bloque la sélection', async () => {
  const directory = await root();
  const before = await prepareVoicePreviews({
    directory,
    apiKey: 'test-key',
    generate: true,
    fetcher: provider('old'),
  });
  const original = await readFile(before.previews[0].file);
  const next = provider('new');
  await expect(
    prepareVoicePreviews({
      directory,
      apiKey: 'test-key',
      generate: true,
      regenerate: true,
      fetcher: next,
      write: async (file, data) => {
        if (file.endsWith('previews.json')) throw new Error('index interruption');
        await atomicWrite(file, data);
      },
    }),
  ).rejects.toThrow('index interruption');
  expect.soft(await readFile(before.previews[0].file)).toEqual(original);
  const selecting = provider('new');
  await expect(
    selectVoicePreview({
      directory,
      apiKey: 'test-key',
      generate: true,
      sample: 1,
      fetcher: selecting,
    }),
  ).rejects.toThrow(/incertain/i);
  expect(selecting).not.toHaveBeenCalled();
  await expect(
    prepareVoicePreviews({ directory, apiKey: 'test-key', generate: true, fetcher: next }),
  ).rejects.toThrow(/incertain/i);
});
it('une nouvelle série garde les anciens fichiers et publie un nouvel index cohérent', async () => {
  const directory = await root();
  const before = await prepareVoicePreviews({
    directory,
    apiKey: 'test-key',
    generate: true,
    fetcher: provider('old'),
  });
  const after = await prepareVoicePreviews({
    directory,
    apiKey: 'test-key',
    generate: true,
    regenerate: true,
    fetcher: provider('new'),
  });
  expect(after.previews[0].file).not.toBe(before.previews[0].file);
  expect((await readFile(before.previews[0].file)).at(-1)).toBe(1);
  expect((await readFile(after.previews[0].file)).at(-1)).toBe(2);
  expect(after.previews[0].generatedVoiceId).toBe('new_1');
});
