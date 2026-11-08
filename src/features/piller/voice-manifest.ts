import { z } from 'zod';
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const voiceProfile = z.object({ id: digest, name: z.string().min(1).max(80) });
const audioEntry = z.object({
  file: z.string().regex(/^\/audio\/piller\/[a-f0-9]{64}\/[a-f0-9]{64}\.mp3$/),
  sha256: digest,
  bytes: z.number().int().min(32).max(2_000_000),
});
export const voiceManifestSchema = z.object({
  version: z.literal(1),
  voice: voiceProfile.nullable(),
  entries: z.record(
    digest,
    z.object({
      file: z.string().regex(/^\/audio\/piller\/[a-f0-9]{64}\/[a-f0-9]{64}\.mp3$/),
      sha256: digest,
      bytes: z.number().int().min(32).max(2_000_000),
    }),
  ),
  archives: z.record(digest, audioEntry.extend({ voice: voiceProfile })).optional(),
});
export type VoiceManifest = z.infer<typeof voiceManifestSchema>;
export const inactiveManifest: VoiceManifest = { version: 1, voice: null, entries: {} };
export async function browserTextKey(text: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((n) => n.toString(16).padStart(2, '0')).join('');
}
