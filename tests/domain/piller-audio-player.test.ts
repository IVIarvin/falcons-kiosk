import { expect, it, vi } from 'vitest';
import { createPillerPlayer } from '@/features/piller/audio-player';
import { browserTextKey, type VoiceManifest } from '@/features/piller/voice-manifest';
import { textKey } from '@/features/piller/voice-build';
const profile = 'a'.repeat(64);
async function manifest(text: string): Promise<VoiceManifest> {
  const key = await browserTextKey(text);
  return {
    version: 1,
    voice: { id: profile, name: 'Adjudant Piller' },
    entries: {
      [key]: { file: `/audio/piller/${profile}/${key}.mp3`, bytes: 100, sha256: 'b'.repeat(64) },
    },
  };
}
function dependencies(loadManifest: () => Promise<VoiceManifest>) {
  const audio = {
    play: vi.fn(async () => {}),
    pause: vi.fn(),
    currentTime: 0,
    onerror: null as null | (() => void),
    onplay: null as null | (() => void),
  };
  return {
    audio,
    createAudio: vi.fn(() => audio),
    loadManifest,
    speakNative: vi.fn(),
    cancelNative: vi.fn(),
    note: vi.fn(),
  };
}
it('lit le MP3 exact et conserve le texte accentué sans altération', async () => {
  const text = 'Café noir. Sans sucre.';
  expect(await browserTextKey(text)).toBe(textKey(text));
  const deps = dependencies(async () => manifest(text));
  const player = createPillerPlayer(deps);
  await player.play(text);
  expect(deps.createAudio).toHaveBeenCalledWith(`/audio/piller/${profile}/${textKey(text)}.mp3`);
  expect(deps.audio.play).toHaveBeenCalledTimes(1);
  expect(deps.speakNative).not.toHaveBeenCalled();
  player.stop();
  expect(deps.audio.pause).toHaveBeenCalled();
});
it('un texte modifié ou une autre voix ne peut lire un ancien fichier', async () => {
  const original = await manifest('Ancien texte');
  const deps = dependencies(async () => original);
  await createPillerPlayer(deps).play('Nouveau texte');
  expect(deps.createAudio).not.toHaveBeenCalled();
  expect(deps.speakNative).not.toHaveBeenCalled();
  expect(deps.note).toHaveBeenCalledWith(expect.stringMatching(/préparé/));
  const changed = { ...original, voice: { id: 'c'.repeat(64), name: 'Adjudant Piller' } };
  const other = dependencies(async () => changed);
  await createPillerPlayer(other).play('Ancien texte');
  expect(other.createAudio).not.toHaveBeenCalled();
});
it('un muet ou démontage pendant le chargement empêche tout son tardif', async () => {
  let resolve!: (m: VoiceManifest) => void;
  const pending = new Promise<VoiceManifest>((r) => (resolve = r));
  const deps = dependencies(() => pending);
  const player = createPillerPlayer(deps);
  const playing = player.play('Au rapport');
  player.stop();
  resolve(await manifest('Au rapport'));
  await playing;
  expect(deps.createAudio).not.toHaveBeenCalled();
  expect(deps.speakNative).not.toHaveBeenCalled();
});
it('conserve la voix actuelle avant activation et traite le refus de lecture sans voix de remplacement', async () => {
  const old = dependencies(async () => ({ version: 1, voice: null, entries: {} }));
  await createPillerPlayer(old).play('Avant activation');
  expect(old.speakNative).toHaveBeenCalledWith('Avant activation');
  const deps = dependencies(async () => manifest('Café noir'));
  deps.audio.play.mockRejectedValue(
    Object.assign(new Error('blocked'), { name: 'NotAllowedError' }),
  );
  await createPillerPlayer(deps).play('Café noir');
  expect(deps.note).toHaveBeenCalledWith(expect.stringMatching(/Écouter/));
  expect(deps.speakNative).not.toHaveBeenCalled();
});
