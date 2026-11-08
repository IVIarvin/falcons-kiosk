import { existsSync } from 'node:fs';
import { mkdir, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { atomicWrite, buildVoiceBank, textKey } from '../src/features/piller/voice-build';
import {
  designVoice,
  createVoice,
  voiceDescription,
  previewText,
} from '../src/features/piller/elevenlabs';
import { quotes } from '../src/features/piller/quotes';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
if (process.env.VERCEL || process.env.NODE_ENV === 'production')
  throw new Error('Préparation locale uniquement ; la production lit les MP3 déjà préparés.');
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    generate: { type: 'boolean', default: false },
    input: { type: 'string' },
    defaults: { type: 'boolean', default: false },
    sample: { type: 'string' },
    'max-characters': { type: 'string' },
    'retry-uncertain': { type: 'boolean', default: false },
    'regenerate-previews': { type: 'boolean', default: false },
  },
});
const command = positionals[0];
const directory = path.resolve('.data/piller-voice');
const apiKey = process.env.ELEVENLABS_API_KEY ?? '';
const previewFile = path.join(directory, 'previews.json');
const selectedFile = path.join(directory, 'selected.json');
async function readJson(file: string) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    throw new Error(
      'Fichier JSON absent ou invalide. Utilise les essais enregistrés ou l’export des répliques.',
    );
  }
}
async function checkPending(file: string) {
  if (existsSync(file) && !values['retry-uncertain'])
    throw new Error(
      'Résultat incertain d’une demande précédente. Vérifie ton compte avant une nouvelle tentative explicite avec --retry-uncertain.',
    );
}
async function run() {
  if (command === 'preview') {
    const fingerprint = textKey(
      JSON.stringify({ voiceDescription, previewText, model: 'eleven_ttv_v3' }),
    );
    if (existsSync(previewFile) && !values['regenerate-previews']) {
      const previous = await readJson(previewFile);
      if (previous.fingerprint === fingerprint) {
        console.log('Essais déjà préparés, aucun appel facturé.');
        for (const preview of previous.previews) console.log(preview.file);
        return;
      }
    }
    if (!values.generate) {
      console.log(
        `Simulation : 3 propositions de voix, texte de ${previewText.length} caractères. Ajoute --generate après configuration de ELEVENLABS_API_KEY.`,
      );
      return;
    }
    if (!apiKey.trim()) throw new Error('Configure ELEVENLABS_API_KEY uniquement dans .env.local.');
    await mkdir(directory, { recursive: true });
    const pending = path.join(directory, 'preview-pending.json');
    await checkPending(pending);
    await atomicWrite(
      pending,
      JSON.stringify({ fingerprint, startedAt: new Date().toISOString() }),
    );
    const result = await designVoice(apiKey);
    const previews = [];
    for (const [index, preview] of result.previews.entries()) {
      const file = path.join(directory, `essai-${index + 1}-${fingerprint.slice(0, 12)}.mp3`);
      await atomicWrite(file, Buffer.from(preview.audio_base_64, 'base64'));
      previews.push({ sample: index + 1, generatedVoiceId: preview.generated_voice_id, file });
    }
    await atomicWrite(
      previewFile,
      JSON.stringify({ fingerprint, text: result.text, voiceDescription, previews }, null, 2),
    );
    await unlink(pending);
    for (const preview of previews) console.log(preview.file);
    return;
  }
  if (command === 'select') {
    const sample = Number(values.sample);
    if (!Number.isInteger(sample) || sample < 1 || sample > 3)
      throw new Error('Choisis --sample 1, 2 ou 3 après écoute des vrais essais.');
    const previews = z
      .object({ previews: z.array(z.object({ sample: z.number(), generatedVoiceId: z.string() })) })
      .parse(await readJson(previewFile));
    const chosen = previews.previews.find((p) => p.sample === sample);
    if (!chosen) throw new Error('Cet essai est absent.');
    if (existsSync(selectedFile)) {
      const previous = await readJson(selectedFile);
      if (previous.generatedVoiceId === chosen.generatedVoiceId) {
        console.log('Voix déjà retenue. Aucun nouvel appel.');
        return;
      }
    }
    if (!values.generate) {
      console.log(
        `Simulation : retenir l’essai ${sample}. Ajoute --generate pour créer la voix dans ton compte.`,
      );
      return;
    }
    if (!apiKey.trim()) throw new Error('Configure ELEVENLABS_API_KEY uniquement dans .env.local.');
    const pending = path.join(directory, 'selection-pending.json');
    await checkPending(pending);
    await atomicWrite(pending, JSON.stringify({ sample, startedAt: new Date().toISOString() }));
    const selected = await createVoice(chosen.generatedVoiceId, apiKey);
    await atomicWrite(
      selectedFile,
      JSON.stringify(
        {
          ...selected,
          generatedVoiceId: chosen.generatedVoiceId,
          modelId: 'eleven_multilingual_v2',
        },
        null,
        2,
      ),
    );
    await unlink(pending);
    console.log(`Essai ${sample} retenu. La banque peut être préparée.`);
    return;
  }
  if (command === 'build') {
    if (!values.input && !values.defaults)
      throw new Error(
        'Utilise --input chemin/repliques.json exporté par l’admin, ou --defaults pour la banque initiale.',
      );
    const bank = values.input
      ? z
          .object({
            version: z.literal(1),
            quotes: z.array(z.object({ id: z.string(), text: z.string(), enabled: z.boolean() })),
          })
          .parse(await readJson(path.resolve(values.input))).quotes
      : quotes.filter((q) => !q.archived).map((q) => ({ id: q.id, text: q.text, enabled: true }));
    const selected = existsSync(selectedFile)
      ? z
          .object({
            voiceId: z.string(),
            modelId: z.literal('eleven_multilingual_v2'),
            name: z.string(),
          })
          .parse(await readJson(selectedFile))
      : null;
    if (values.generate && !selected)
      throw new Error(
        'Produis et écoute les essais, puis retiens une voix avant de générer la banque.',
      );
    const maxCharacters =
      values['max-characters'] === undefined ? 6000 : Number(values['max-characters']);
    if (!Number.isSafeInteger(maxCharacters) || maxCharacters < 1 || maxCharacters > 160000)
      throw new Error('Plafond de caractères invalide.');
    const result = await buildVoiceBank({
      directory: path.resolve('public/audio/piller'),
      stateDirectory: path.join(directory, 'generation'),
      quotes: bank,
      profile: selected ?? {
        voiceId: 'not_selected',
        modelId: 'eleven_multilingual_v2',
        name: 'Adjudant Piller',
      },
      generate: values.generate,
      maxCharacters,
      apiKey,
      retryUncertain: values['retry-uncertain'],
    });
    console.log(
      JSON.stringify({
        mode: values.generate ? 'génération' : 'simulation',
        ...result,
        voiceSelected: !!selected,
      }),
    );
    return;
  }
  throw new Error(
    'Commandes : preview, select --sample N, build --input fichier.json. Simulation par défaut ; --generate active les appels.',
  );
}
run().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Préparation impossible.');
  process.exitCode = 1;
});
