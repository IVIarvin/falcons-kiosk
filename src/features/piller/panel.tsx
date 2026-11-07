'use client';
import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play, AudioLines } from 'lucide-react';
import { quotes, topicLabels, type QuoteTopic } from './quotes';
import { Dialog } from '@/components/ui';
import { useApp } from '@/components/context';
export function PillerComment({
  quoteId,
  auto = false,
  forcePlay = false,
}: {
  quoteId: string;
  auto?: boolean;
  forcePlay?: boolean;
}) {
  const quote = quotes.find((q) => q.id === quoteId);
  const [muted, setMuted] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');
  const played = useRef<string | null>(null);
  function speak() {
    if (!quote) return;
    if (!('speechSynthesis' in window)) {
      setVoiceNote('Lecture vocale indisponible sur cet appareil.');
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.lang.startsWith('fr-CH')) ?? voices.find((v) => v.lang.startsWith('fr'));
    if (!voice && voices.length) {
      setVoiceNote('Aucune voix française disponible. Le texte reste affiché.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(quote.text);
    utterance.lang = 'fr-CH';
    if (voice) utterance.voice = voice;
    utterance.rate = 0.98;
    utterance.pitch = 0.8;
    utterance.onerror = () =>
      setVoiceNote('Lecture interrompue. Appuie sur Écouter pour réessayer.');
    utterance.onstart = () => setVoiceNote('');
    window.speechSynthesis.speak(utterance);
  }
  useEffect(() => {
    const saved = localStorage.getItem('falcons_muted') === '1';
    setMuted(saved);
    const timer = setTimeout(() => {
      if ((forcePlay || (auto && !saved)) && played.current !== quoteId) {
        played.current = quoteId;
        speak();
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [quoteId, auto, forcePlay]);
  if (!quote) return null;
  return (
    <div className="piller-comment">
      <span className="piller-initials">AP</span>
      <div>
        <strong>Adjudant Piller</strong>
        <p>{quote.text}</p>
        {voiceNote && <small role="status">{voiceNote}</small>}
      </div>
      <div className="voice-actions">
        <button className="icon-button" aria-label="Écouter la réplique" onClick={speak}>
          <Volume2 size={21} />
        </button>
        <button
          className="icon-button muted"
          onClick={() => {
            const value = !muted;
            setMuted(value);
            localStorage.setItem('falcons_muted', value ? '1' : '0');
            if (value && 'speechSynthesis' in window) window.speechSynthesis.cancel();
          }}
          aria-label={muted ? 'Activer le son' : 'Couper le son'}
          aria-pressed={muted}
        >
          {muted ? <VolumeX size={17} /> : <AudioLines size={17} />}
        </button>
      </div>
    </div>
  );
}
export function PillerAdminPanel() {
  const { state, run, busy } = useApp();
  const [example, setExample] = useState(false);
  const settings = state.admin?.settings;
  if (!settings) return null;
  return (
    <aside className="piller-panel">
      <h2>Adjudant Piller</h2>
      <img
        className="wireframe"
        src="/brand/falcon-wireframe.png"
        alt="Faucon filaire, emblème Falcons"
      />
      <div className="piller-setting">
        <label className="switch-label">
          <span>Activer Adjudant Piller</span>
          <input
            type="checkbox"
            role="switch"
            checked={settings.pillerEnabled}
            disabled={busy}
            onChange={(e) => {
              void run('settings', { ...settings, pillerEnabled: e.target.checked }).catch(
                () => {},
              );
            }}
          />
        </label>
        <p>Commentaire écrit + voix après chaque achat.</p>
      </div>
      <div className="piller-example">
        <h3>Exemple de réplique</h3>
        {example ? (
          <PillerComment quoteId="piller-v2-general-1" forcePlay />
        ) : (
          <>
            <p className="sample-quote">
              T’as le ravitaillement d’un régiment et le rendement d’une chaise pliante.
            </p>
            <button className="button secondary" onClick={() => setExample(true)}>
              <Play size={16} /> Écouter
            </button>
          </>
        )}
      </div>
      <p className="panel-footnote">TWINT reste externe. Confirme les paiements après réception.</p>
    </aside>
  );
}

export function PillerLibrary() {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<QuoteTopic | 'all'>('all');
  const active = quotes.filter((q) => !q.archived);
  const visible = active.filter((q) => topic === 'all' || q.topic === topic);
  return (
    <section className="piller-library">
      <div>
        <h2>Le répertoire de Piller</h2>
        <p>
          {active.length} répliques. Langage de caserne, patience inexistante. Le panier donne le
          ton.
        </p>
      </div>
      <button type="button" className="button secondary" onClick={() => setOpen(true)}>
        Voir les {active.length} répliques
      </button>
      {open && (
        <Dialog title="Le répertoire de Piller" onClose={() => setOpen(false)}>
          <label className="field">
            <span>Thème des répliques</span>
            <select value={topic} onChange={(e) => setTopic(e.target.value as QuoteTopic | 'all')}>
              <option value="all">Tous les thèmes</option>
              {Object.entries(topicLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <p className="muted">
            {visible.length} répliques · Écoute un exemple pour tester la voix de cet appareil.
          </p>
          <div className="quote-library-list">
            {visible.map((q) => (
              <article key={q.id}>
                <small>{topicLabels[q.topic]}</small>
                <PillerComment quoteId={q.id} />
              </article>
            ))}
          </div>
        </Dialog>
      )}
    </section>
  );
}
