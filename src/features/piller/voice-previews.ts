import { existsSync } from 'node:fs';
import { mkdir, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { atomicWrite, textKey } from './voice-build';
import { designVoice, createVoice, voiceDescription, previewText } from './elevenlabs';
type Options = {
  directory: string;
  apiKey: string;
  generate?: boolean;
  retryUncertain?: boolean;
  fetcher?: typeof fetch;
  write?: typeof atomicWrite;
};
async function json(file: string) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    throw new Error('Fichier JSON absent ou invalide.');
  }
}
async function checkPending(file: string, retry?: boolean) {
  if (existsSync(file) && !retry)
    throw new Error(
      'Résultat incertain : vérifie le compte avant une nouvelle tentative explicite.',
    );
}
export async function prepareVoicePreviews(options: Options & { regenerate?: boolean }) {
  const { directory, apiKey } = options;
  const write = options.write ?? atomicWrite;
  const indexFile = path.join(directory, 'previews.json');
  const pending = path.join(directory, 'preview-pending.json');
  const unresolved = existsSync(pending);
  await checkPending(pending, options.retryUncertain);
  const fingerprint = textKey(
    JSON.stringify({ voiceDescription, previewText, model: 'eleven_ttv_v3' }),
  );
  if (existsSync(indexFile) && !options.regenerate && !unresolved) {
    const previous = await json(indexFile);
    if (previous.fingerprint === fingerprint) return { ...previous, reused: true };
  }
  if (!options.generate)
    return { simulated: true, textCharacters: previewText.length, previews: [] };
  if (!apiKey.trim()) throw new Error('Configure ELEVENLABS_API_KEY uniquement dans .env.local.');
  await mkdir(directory, { recursive: true });
  const batch = randomUUID();
  await write(pending, JSON.stringify({ fingerprint, batch, startedAt: new Date().toISOString() }));
  const result = await designVoice(apiKey, options.fetcher);
  const previews = [];
  for (const [index, preview] of result.previews.entries()) {
    const file = path.join(directory, 'previews', batch, `essai-${index + 1}.mp3`);
    await write(file, Buffer.from(preview.audio_base_64, 'base64'));
    previews.push({ sample: index + 1, generatedVoiceId: preview.generated_voice_id, file });
  }
  const completed = { fingerprint, text: result.text, voiceDescription, previews };
  await write(indexFile, JSON.stringify(completed, null, 2));
  await unlink(pending);
  return completed;
}
export async function selectVoicePreview(options: Options & { sample: number }) {
  const { directory, apiKey, sample } = options;
  const write = options.write ?? atomicWrite;
  await checkPending(path.join(directory, 'preview-pending.json'));
  if (!Number.isInteger(sample) || sample < 1 || sample > 3)
    throw new Error('Choisis --sample 1, 2 ou 3 après écoute des vrais essais.');
  const previews = z
    .object({ previews: z.array(z.object({ sample: z.number(), generatedVoiceId: z.string() })) })
    .parse(await json(path.join(directory, 'previews.json')));
  const chosen = previews.previews.find((p) => p.sample === sample);
  if (!chosen) throw new Error('Cet essai est absent.');
  const selectedFile = path.join(directory, 'selected.json');
  if (existsSync(selectedFile)) {
    const previous = await json(selectedFile);
    if (previous.generatedVoiceId === chosen.generatedVoiceId) return { ...previous, reused: true };
  }
  if (!options.generate) return { simulated: true, sample };
  if (!apiKey.trim()) throw new Error('Configure ELEVENLABS_API_KEY uniquement dans .env.local.');
  const pending = path.join(directory, 'selection-pending.json');
  await checkPending(pending, options.retryUncertain);
  await write(pending, JSON.stringify({ sample, startedAt: new Date().toISOString() }));
  const selected = await createVoice(chosen.generatedVoiceId, apiKey, options.fetcher);
  const result = {
    ...selected,
    generatedVoiceId: chosen.generatedVoiceId,
    modelId: 'eleven_multilingual_v2' as const,
  };
  await write(selectedFile, JSON.stringify(result, null, 2));
  await unlink(pending);
  return result;
}
