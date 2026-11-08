import { z } from 'zod';
export const voiceDescription =
  'Native French-speaking man, aged 50 to 60. A distinctly masculine, very deep bass voice, resonant chest register, slightly gravelly and weathered. Dry, stern, sardonic drill-sergeant delivery, controlled and unhurried, crisp French diction. Natural human sound, not a monster, not cartoonish, no shouting. Clean studio recording.';
export const previewText =
  'Au rapport, les Falcons. Café noir, sans sucre. On a déjà assez de mous dans cette section. Deux cents chevaux dans la canette, un demi-âne derrière. Ravitaillement terminé, feignasse. Essaie maintenant de mériter les calories.';
export const voiceSettings = {
  stability: 0.65,
  similarity_boost: 0.8,
  style: 0.15,
  use_speaker_boost: true,
  speed: 0.92,
};
export class VoiceProviderError extends Error {
  constructor(
    public uncertain: boolean,
    public status?: number,
  ) {
    super(
      uncertain
        ? 'Génération incertaine : aucune relance automatique. Vérifie le résultat avant de réessayer.'
        : `ElevenLabs a refusé la demande${status ? ` (HTTP ${status})` : ''}. Vérifie le compte et les autorisations.`,
    );
  }
}
export function validateMp3(bytes: Uint8Array) {
  if (
    bytes.length < 32 ||
    bytes.length > 2_000_000 ||
    !(
      (bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51) ||
      (bytes[0] === 255 && (bytes[1] & 224) === 224)
    )
  )
    throw new VoiceProviderError(true);
  return bytes;
}
async function request(endpoint: string, input: unknown, apiKey: string, fetcher: typeof fetch) {
  if (!apiKey.trim()) throw new Error('Configure ELEVENLABS_API_KEY uniquement dans .env.local.');
  try {
    const response = await fetcher(`https://api.elevenlabs.io/v1/${endpoint}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(45000),
      redirect: 'error',
    });
    if (!response.ok)
      throw new VoiceProviderError(
        response.status >= 500 || response.status === 408,
        response.status,
      );
    return response;
  } catch (error) {
    if (error instanceof VoiceProviderError) throw error;
    throw new VoiceProviderError(true);
  }
}
async function limitedBytes(response: Response, limit: number) {
  const reader = response.body?.getReader();
  if (!reader) throw new VoiceProviderError(true);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) {
        await reader.cancel();
        throw new VoiceProviderError(true);
      }
      chunks.push(value);
    }
  } catch {
    throw new VoiceProviderError(true);
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const value of chunks) {
    result.set(value, offset);
    offset += value.length;
  }
  return result;
}
export async function synthesizeVoice(
  text: string,
  voiceId: string,
  modelId: string,
  apiKey: string,
  fetcher: typeof fetch = fetch,
) {
  const response = await request(
    `text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    { text, model_id: modelId, voice_settings: voiceSettings },
    apiKey,
    fetcher,
  );
  if (!response.headers.get('content-type')?.startsWith('audio/mpeg'))
    throw new VoiceProviderError(true);
  return validateMp3(await limitedBytes(response, 2_000_000));
}
export async function designVoice(apiKey: string, fetcher: typeof fetch = fetch) {
  const response = await request(
    'text-to-voice/design?output_format=mp3_44100_128',
    { voice_description: voiceDescription, text: previewText, model_id: 'eleven_ttv_v3' },
    apiKey,
    fetcher,
  );
  try {
    const result = z
      .object({
        previews: z
          .array(
            z.object({
              generated_voice_id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
              audio_base_64: z.string().max(3_000_000),
              media_type: z.literal('audio/mpeg'),
              duration_secs: z.number().positive(),
            }),
          )
          .min(1)
          .max(3),
        text: z.string(),
      })
      .parse(JSON.parse(new TextDecoder().decode(await limitedBytes(response, 10_000_000))));
    for (const preview of result.previews)
      validateMp3(Buffer.from(preview.audio_base_64, 'base64'));
    return result;
  } catch {
    throw new VoiceProviderError(true);
  }
}
export async function createVoice(
  generatedVoiceId: string,
  apiKey: string,
  fetcher: typeof fetch = fetch,
) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(generatedVoiceId))
    throw new Error('Identifiant d’essai invalide.');
  const response = await request(
    'text-to-voice',
    {
      voice_name: 'Adjudant Piller',
      voice_description: voiceDescription,
      generated_voice_id: generatedVoiceId,
    },
    apiKey,
    fetcher,
  );
  try {
    const result = z
      .object({ voice_id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/), name: z.string().optional() })
      .parse(JSON.parse(new TextDecoder().decode(await limitedBytes(response, 1_000_000))));
    return { voiceId: result.voice_id, name: 'Adjudant Piller' };
  } catch {
    throw new VoiceProviderError(true);
  }
}
