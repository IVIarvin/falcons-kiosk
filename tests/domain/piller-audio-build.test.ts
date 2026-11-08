import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildVoiceBank, profileKey, textKey } from '@/features/piller/voice-build';
import { designVoice, createVoice } from '@/features/piller/elevenlabs';

const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});
async function root() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'falcons-voice-'));
  directories.push(directory);
  return directory;
}
const profile = {
  voiceId: 'voice_falcons',
  modelId: 'eleven_multilingual_v2',
  name: 'Adjudant Piller',
};
const bank = [
  { id: 'one', text: 'Café noir. Sans sucre.', enabled: true },
  { id: 'two', text: 'Au rapport, feignasse.', enabled: true },
  { id: 'off', text: 'Ne pas générer.', enabled: false },
];
const mp3 = new Uint8Array([73, 68, 51, 4, 0, 0, ...new Array(40).fill(0)]);
const provider = () =>
  vi.fn(async () => new Response(mp3, { headers: { 'content-type': 'audio/mpeg' } }));

it('simule le coût et refuse un dépassement sans appel ni activation', async () => {
  const directory = await root();
  const fetcher = provider();
  const result = await buildVoiceBank({
    directory,
    quotes: bank,
    profile,
    fetcher,
    generate: false,
  });
  expect(result.characters).toBe(bank[0].text.length + bank[1].text.length);
  expect(result.missing).toBe(2);
  expect(fetcher).not.toHaveBeenCalled();
  await expect(readFile(path.join(directory, 'manifest.json'))).rejects.toThrow();
  await expect(
    buildVoiceBank({
      directory,
      quotes: bank,
      profile,
      fetcher,
      generate: true,
      apiKey: 'test-secret',
      maxCharacters: 1,
    }),
  ).rejects.toThrow(/plafond/i);
  expect(fetcher).not.toHaveBeenCalled();
});
it('réutilise les fichiers, conserve l’ancien texte et invalide une autre voix', async () => {
  const directory = await root();
  const fetcher = provider();
  const options = {
    directory,
    quotes: bank,
    profile,
    fetcher,
    generate: true,
    apiKey: 'test-secret',
  };
  await buildVoiceBank(options);
  await buildVoiceBank(options);
  expect(fetcher).toHaveBeenCalledTimes(2);
  const edited = [{ ...bank[0], text: 'Café serré. Discipline en vrac.' }, bank[1]];
  await buildVoiceBank({ ...options, quotes: edited });
  expect(fetcher).toHaveBeenCalledTimes(3);
  const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
  expect(manifest.entries[textKey(bank[0].text)]).toBeDefined();
  expect(manifest.entries[textKey(edited[0].text)]).toBeDefined();
  expect(JSON.stringify(manifest)).not.toContain('test-secret');
  expect(JSON.stringify(manifest)).not.toContain(profile.voiceId);
  await buildVoiceBank({
    ...options,
    quotes: edited,
    profile: { ...profile, voiceId: 'another_voice' },
  });
  expect(fetcher).toHaveBeenCalledTimes(5);
  const changed = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
  expect(changed.voice.id).not.toBe(manifest.voice.id);
  expect(changed.entries[textKey(bank[0].text)]).toBeUndefined();
  expect(changed.archives?.[textKey(bank[0].text)]).toMatchObject({ voice: manifest.voice });
});
it('une réponse perdue ne déclenche aucune reprise payante automatique', async () => {
  const directory = await root();
  const fetcher = vi.fn(async () => {
    throw new Error('échec test-secret');
  });
  const options = {
    directory,
    quotes: [bank[0]],
    profile,
    fetcher,
    generate: true,
    apiKey: 'test-secret',
  };
  await expect(buildVoiceBank(options)).rejects.toThrow(/incertaine/i);
  await expect(buildVoiceBank(options)).rejects.toThrow(/incertaine/i);
  expect(fetcher).toHaveBeenCalledTimes(1);
  const resumed = provider();
  await buildVoiceBank({ ...options, fetcher: resumed, retryUncertain: true });
  expect(resumed).toHaveBeenCalledTimes(1);
});
it('une interruption après un fichier réussi reprend uniquement le fichier manquant', async () => {
  const directory = await root();
  let calls = 0;
  const fetcher = vi.fn(async () => {
    if (++calls === 2) throw new Error('lost');
    return new Response(mp3, { headers: { 'content-type': 'audio/mpeg' } });
  });
  await expect(
    buildVoiceBank({
      directory,
      quotes: bank,
      profile,
      fetcher,
      generate: true,
      apiKey: 'test-secret',
    }),
  ).rejects.toThrow(/incertaine/i);
  const resumed = provider();
  await buildVoiceBank({
    directory,
    quotes: bank,
    profile,
    fetcher: resumed,
    generate: true,
    apiKey: 'test-secret',
    retryUncertain: true,
  });
  expect(resumed).toHaveBeenCalledTimes(1);
});
it('refuse les erreurs et faux MP3 sans révéler la clé', async () => {
  for (const fetcher of [
    async () => Response.json({ error: 'test-secret' }, { status: 401 }),
    async () => new Response('not mp3', { headers: { 'content-type': 'audio/mpeg' } }),
  ]) {
    const directory = await root();
    await expect(
      buildVoiceBank({
        directory,
        quotes: [bank[0]],
        profile,
        fetcher,
        generate: true,
        apiKey: 'test-secret',
      }),
    ).rejects.not.toThrow('test-secret');
    await expect(readFile(path.join(directory, 'manifest.json'))).rejects.toThrow();
  }
});
it('prépare les trois essais puis crée seulement la voix choisie', async () => {
  const fetcher = vi.fn(async (url: RequestInfo | URL, options?: RequestInit) => {
    const body = JSON.parse(String(options?.body));
    expect((options?.headers as Record<string, string>)['xi-api-key']).toBe('test-secret');
    if (new URL(String(url)).pathname.endsWith('/design')) {
      expect(body.voice_description).toMatch(/male|masculine/i);
      expect(body.text.length).toBeGreaterThanOrEqual(100);
      return Response.json({
        previews: [1, 2, 3].map((i) => ({
          generated_voice_id: `preview_${i}`,
          audio_base_64: Buffer.from(mp3).toString('base64'),
          media_type: 'audio/mpeg',
          duration_secs: 3,
        })),
        text: body.text,
      });
    }
    expect(body.generated_voice_id).toBe('preview_2');
    return Response.json({ voice_id: 'chosen_voice', name: 'Adjudant Piller' });
  });
  const result = await designVoice('test-secret', fetcher);
  expect(result.previews).toHaveLength(3);
  expect(await createVoice('preview_2', 'test-secret', fetcher)).toEqual({
    voiceId: 'chosen_voice',
    name: 'Adjudant Piller',
  });
  expect(profileKey(profile)).not.toBe(profileKey({ ...profile, modelId: 'eleven_v3' }));
});
