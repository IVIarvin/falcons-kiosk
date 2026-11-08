import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { buildVoiceBank } from '../src/features/piller/voice-build';
import { prepareVoicePreviews, selectVoicePreview } from '../src/features/piller/voice-previews';
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
async function run() {
  if (command === 'preview') {
    const result = await prepareVoicePreviews({
      directory,
      apiKey,
      generate: values.generate,
      regenerate: values['regenerate-previews'],
      retryUncertain: values['retry-uncertain'],
    });
    if ('simulated' in result && result.simulated)
      console.log(
        'Simulation : 3 propositions de voix, texte de ' +
          result.textCharacters +
          ' caractères. Ajoute --generate après configuration de ELEVENLABS_API_KEY.',
      );
    else {
      console.log('Essais préparés ou réutilisés.');
      for (const preview of result.previews) console.log(preview.file);
    }
    return;
  }
  if (command === 'select') {
    const result = await selectVoicePreview({
      directory,
      apiKey,
      sample: Number(values.sample),
      generate: values.generate,
      retryUncertain: values['retry-uncertain'],
    });
    console.log(
      'simulated' in result && result.simulated
        ? 'Simulation du choix : ajoute --generate pour retenir cet essai dans le compte.'
        : 'Voix retenue ou déjà sélectionnée. La banque peut être préparée.',
    );
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
