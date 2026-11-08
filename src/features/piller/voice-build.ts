import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { voiceManifestSchema, inactiveManifest, type VoiceManifest } from './voice-manifest';
import { synthesizeVoice, voiceSettings, VoiceProviderError, validateMp3 } from './elevenlabs';
export type VoiceProfile = { voiceId: string; modelId: string; name: string };
export const textKey = (text: string) => createHash('sha256').update(text).digest('hex');
export const profileKey = (profile: VoiceProfile) =>
  textKey(
    JSON.stringify({ voiceId: profile.voiceId, modelId: profile.modelId, settings: voiceSettings }),
  );
const quoteSchema = z
  .array(
    z.object({
      id: z.string().min(1).max(100),
      text: z.string().min(1).max(160),
      enabled: z.boolean(),
    }),
  )
  .max(1000);
type Options = {
  directory: string;
  stateDirectory?: string;
  quotes: unknown;
  profile: VoiceProfile;
  generate?: boolean;
  maxCharacters?: number;
  apiKey?: string;
  retryUncertain?: boolean;
  fetcher?: typeof fetch;
};
export async function atomicWrite(file: string, data: string | Uint8Array) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, data);
    await rename(temporary, file);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
async function readManifest(file: string) {
  try {
    return voiceManifestSchema.parse(JSON.parse(await readFile(file, 'utf8')));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return inactiveManifest;
    throw new Error('Manifeste audio invalide. Aucun fichier ne sera remplacé.');
  }
}
export async function buildVoiceBank(options: Options) {
  const quotes = [
    ...new Map(
      quoteSchema
        .parse(options.quotes)
        .filter((q) => q.enabled)
        .map((q) => [q.text, q]),
    ).values(),
  ];
  if (!quotes.length) throw new Error('Aucune réplique active à préparer.');
  const profile = z
    .object({
      voiceId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
      modelId: z.literal('eleven_multilingual_v2'),
      name: z.string().min(1).max(80),
    })
    .parse(options.profile);
  const id = profileKey(profile);
  const manifestPath = path.join(options.directory, 'manifest.json');
  const previous = await readManifest(manifestPath);
  const entries: VoiceManifest['entries'] = {};
  const archives: NonNullable<VoiceManifest['archives']> = { ...previous.archives };
  if (previous.voice && previous.voice.id !== id)
    for (const [key, entry] of Object.entries(previous.entries))
      archives[key] = { ...entry, voice: previous.voice };
  if (previous.voice?.id === id) Object.assign(entries, previous.entries);
  const missing: { text: string; key: string; file: string }[] = [];
  for (const quote of quotes) {
    const key = textKey(quote.text);
    const relative = `${id}/${key}.mp3`;
    const file = path.join(options.directory, relative);
    try {
      const bytes = validateMp3(await readFile(file));
      entries[key] = {
        file: `/audio/piller/${relative}`,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        bytes: bytes.length,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
        throw new Error(
          'Un fichier audio existant est invalide. Corrige-le avant toute régénération.',
        );
      missing.push({ text: quote.text, key, file });
    }
  }
  const characters = missing.reduce((n, q) => n + q.text.length, 0);
  const result = {
    characters,
    missing: missing.length,
    reused: quotes.length - missing.length,
    generated: 0,
  };
  if (characters > (options.maxCharacters ?? 6000))
    throw new Error(
      `Le plafond de caractères est dépassé (${characters}). Aucune génération lancée.`,
    );
  if (!options.generate) return result;
  if (!options.apiKey?.trim() && missing.length)
    throw new Error('Configure ELEVENLABS_API_KEY uniquement dans .env.local.');
  const stateDirectory = options.stateDirectory ?? path.join(options.directory, '.generation');
  await mkdir(stateDirectory, { recursive: true });
  const lockPath = path.join(stateDirectory, 'generation.lock');
  let lock;
  try {
    lock = await open(lockPath, 'wx');
  } catch {
    throw new Error(
      'Une préparation est déjà en cours, ou son verrou doit être vérifié après une interruption.',
    );
  }
  try {
    for (const quote of missing) {
      try {
        const bytes = validateMp3(await readFile(quote.file));
        entries[quote.key] = {
          file: `/audio/piller/${id}/${quote.key}.mp3`,
          sha256: createHash('sha256').update(bytes).digest('hex'),
          bytes: bytes.length,
        };
        result.reused++;
        continue;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
          throw new Error('Un fichier audio existant est invalide.');
      }
      const journal = path.join(stateDirectory, `${id}-${quote.key}.json`);
      let status: string | undefined;
      try {
        status = JSON.parse(await readFile(journal, 'utf8')).status;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
          throw new Error('Journal audio invalide.');
      }
      if ((status === 'pending' || status === 'uncertain') && !options.retryUncertain)
        throw new Error(
          'Génération incertaine : vérifie le résultat puis utilise explicitement --retry-uncertain si nécessaire.',
        );
      await atomicWrite(
        journal,
        JSON.stringify({ status: 'pending', characters: quote.text.length }),
      );
      let bytes: Uint8Array;
      try {
        bytes = await synthesizeVoice(
          quote.text,
          profile.voiceId,
          profile.modelId,
          options.apiKey!,
          options.fetcher,
        );
      } catch (error) {
        await atomicWrite(
          journal,
          JSON.stringify({
            status:
              error instanceof VoiceProviderError && !error.uncertain ? 'failed' : 'uncertain',
            characters: quote.text.length,
          }),
        );
        throw error;
      }
      await atomicWrite(quote.file, bytes);
      entries[quote.key] = {
        file: `/audio/piller/${id}/${quote.key}.mp3`,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        bytes: bytes.length,
      };
      await atomicWrite(
        journal,
        JSON.stringify({ status: 'ready', characters: quote.text.length }),
      );
      result.generated++;
    }
    const manifest: VoiceManifest = {
      version: 1,
      voice: { id, name: profile.name },
      entries,
      archives,
    };
    await atomicWrite(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    return result;
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}
