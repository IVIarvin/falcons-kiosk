'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Volume2, VolumeX, Play, AudioLines } from 'lucide-react';
import { quotes, topicLabels, type QuoteTopic } from './quotes';
import { Dialog, DownloadLink } from '@/components/ui';
import { useApp } from '@/components/context';
import type { ManagedQuote } from './service';
import styles from './editor.module.css';
import { createPillerPlayer, loadVoiceManifest, stopPillerAudio } from './audio-player';
export function PillerComment({
  quoteId,
  text,
  auto = false,
  forcePlay = false,
}: {
  quoteId: string;
  text?: string;
  auto?: boolean;
  forcePlay?: boolean;
}) {
  const quote = text === undefined ? quotes.find((q) => q.id === quoteId) : { id: quoteId, text };
  const [muted, setMuted] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');
  const played = useRef<string | null>(null);
  const player = useRef<ReturnType<typeof createPillerPlayer> | null>(null);
  function speakNative(text: string) {
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
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-CH';
    if (voice) utterance.voice = voice;
    utterance.rate = 0.98;
    utterance.pitch = 0.8;
    utterance.onerror = () =>
      setVoiceNote('Lecture interrompue. Appuie sur Écouter pour réessayer.');
    utterance.onstart = () => setVoiceNote('');
    window.speechSynthesis.speak(utterance);
  }
  function speak() {
    if (!quote) return;
    player.current ??= createPillerPlayer({
      loadManifest: loadVoiceManifest,
      createAudio: (url) => new Audio(url),
      speakNative,
      cancelNative: () => {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      },
      note: setVoiceNote,
    });
    void player.current.play(quote.text);
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
      player.current?.stop();
    };
  }, [quoteId, text, auto, forcePlay]);
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
        <button
          type="button"
          className="icon-button"
          aria-label="Écouter la réplique"
          onClick={speak}
        >
          <Volume2 size={21} />
        </button>
        <button
          type="button"
          className="icon-button muted"
          onClick={() => {
            const value = !muted;
            setMuted(value);
            localStorage.setItem('falcons_muted', value ? '1' : '0');
            if (value) {
              player.current?.stop();
              stopPillerAudio();
            }
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
  const sample =
    state.admin?.pillerQuotes.find((q) => q.enabled && q.topic === 'general') ??
    state.admin?.pillerQuotes.find((q) => q.enabled);
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
        {example && sample ? (
          <PillerComment quoteId={sample.id} text={sample.text} forcePlay />
        ) : (
          <>
            <p className="sample-quote">
              {sample?.text ??
                'Toutes les répliques sont désactivées. Modifie leur activation dans les réglages.'}
            </p>
            <button
              className="button secondary"
              disabled={!sample}
              onClick={() => setExample(true)}
            >
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
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<QuoteTopic | 'all'>('all');
  const library = state.admin?.pillerQuotes ?? [];
  const active = library.filter((q) => q.enabled);
  const visible = library.filter((q) => topic === 'all' || q.topic === topic);
  return (
    <section className="piller-library">
      <div>
        <h2>Le répertoire de Piller</h2>
        <p>
          {active.length} répliques actives sur {library.length}. Modifie leur texte, leur thème et
          leur activation.
        </p>
      </div>
      <button type="button" className="button secondary" onClick={() => setOpen(true)}>
        Voir les {library.length} répliques
      </button>
      <DownloadLink href="/api/admin/documents/piller">Exporter les répliques</DownloadLink>
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
            {visible.length} répliques · Les changements s’appliquent aux prochains achats.
          </p>
          <div className="quote-library-list">
            {visible.map((q) => (
              <QuoteEditor
                key={q.id}
                quote={q}
                number={library.findIndex((item) => item.id === q.id) + 1}
              />
            ))}
          </div>
        </Dialog>
      )}
    </section>
  );
}

function QuoteEditor({ quote, number }: { quote: ManagedQuote; number: number }) {
  const { run, busy } = useApp();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(quote.text);
  const [topic, setTopic] = useState(quote.topic);
  const [enabled, setEnabled] = useState(quote.enabled);
  const [revision, setRevision] = useState(quote.revision);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  function edit() {
    setText(quote.text);
    setTopic(quote.topic);
    setEnabled(quote.enabled);
    setRevision(quote.revision);
    setError('');
    setSaved(false);
    setEditing(true);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      await run('pillerQuote', { id: quote.id, text, topic, enabled, revision });
      setEditing(false);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <article className={`quote-editor ${!quote.enabled ? 'quote-disabled' : ''}`}>
      <div className={styles.heading}>
        <small>
          {number} · {topicLabels[quote.topic]}
        </small>
        <span className="status">{quote.enabled ? 'Active' : 'Désactivée'}</span>
      </div>
      {editing ? (
        <form onSubmit={save} className={styles.form}>
          <label className="field">
            <span>Texte de la réplique</span>
            <textarea
              aria-label="Texte de la réplique"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={160}
              required
              disabled={busy}
            />
            <small>{text.length}/160 caractères</small>
          </label>
          <label className="field">
            <span>Thème de la réplique</span>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value as QuoteTopic)}
              disabled={busy}
            >
              {Object.entries(topicLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="check-line">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={busy}
            />{' '}
            Réplique active
          </label>
          <PillerComment quoteId={quote.id} text={text} />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <button type="submit" className="button primary" disabled={busy || !text.trim()}>
              Enregistrer la réplique
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <>
          <PillerComment quoteId={quote.id} text={quote.text} />
          <button
            type="button"
            className={`text-button ${styles.editButton}`}
            disabled={busy}
            aria-label={`Modifier la réplique ${number}`}
            onClick={edit}
          >
            Modifier
          </button>
          {saved && (
            <p role="status" className="muted">
              Réplique enregistrée.
            </p>
          )}
        </>
      )}
    </article>
  );
}
