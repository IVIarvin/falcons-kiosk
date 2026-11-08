import { browserTextKey, voiceManifestSchema, type VoiceManifest } from './voice-manifest';
type Playable = {
  play: () => Promise<void>;
  pause: () => void;
  currentTime: number;
  onplay: ((...args: never[]) => unknown) | null;
  onerror: ((...args: never[]) => unknown) | null;
};
type Dependencies = {
  loadManifest: () => Promise<VoiceManifest>;
  createAudio: (url: string) => Playable;
  speakNative: (text: string) => void;
  cancelNative: () => void;
  note: (message: string) => void;
};
let activeStop: (() => void) | null = null;
export function stopPillerAudio() {
  activeStop?.();
}
export async function loadVoiceManifest() {
  const response = await fetch('/audio/piller/manifest.json', {
    cache: 'no-store',
    credentials: 'omit',
  });
  if (!response.ok) throw new Error('Manifeste indisponible.');
  return voiceManifestSchema.parse(await response.json());
}
export function createPillerPlayer(deps: Dependencies) {
  let generation = 0;
  let audio: Playable | null = null;
  function stop() {
    ++generation;
    if (audio) {
      audio.onplay = null;
      audio.onerror = null;
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {}
      audio = null;
    }
    if (activeStop === stop) {
      deps.cancelNative();
      activeStop = null;
    }
  }
  async function play(text: string) {
    activeStop?.();
    stop();
    activeStop = stop;
    const current = generation;
    deps.note('');
    try {
      const manifest = await deps.loadManifest();
      if (current !== generation) return;
      if (manifest.voice === null) {
        deps.speakNative(text);
        return;
      }
      const key = await browserTextKey(text);
      if (current !== generation) return;
      const entry = manifest.entries[key];
      if (!entry || entry.file !== `/audio/piller/${manifest.voice.id}/${key}.mp3`) {
        deps.note('Audio dédié non préparé pour cette réplique. Le texte reste disponible.');
        return;
      }
      audio = deps.createAudio(entry.file);
      audio.onplay = () => {
        if (current === generation) deps.note('');
      };
      audio.onerror = () => {
        if (current === generation)
          deps.note('Audio indisponible. Appuie sur Écouter pour réessayer.');
      };
      await audio.play();
    } catch (error) {
      if (current !== generation) return;
      deps.note(
        error instanceof Error && error.name === 'NotAllowedError'
          ? 'Appuie sur Écouter pour lancer la lecture.'
          : 'Lecture indisponible. Le texte reste affiché ; appuie sur Écouter pour réessayer.',
      );
    }
  }
  return { play, stop };
}
