'use client';
import { useRef, useState } from 'react';
import { Check, Shuffle } from 'lucide-react';
import { Dialog } from '@/components/ui';
import { ScoutAvatar } from '@/components/scout-avatar';
import styles from './avatar-picker.module.css';
const newChoices = () => Array.from({ length: 6 }, () => crypto.randomUUID());
export function AvatarPicker({
  savedSeed,
  onSave,
  onClose,
}: {
  savedSeed: string;
  onSave: (seed: string) => Promise<void>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(savedSeed);
  const [choices, setChoices] = useState(newChoices);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const changed = selected !== savedSeed;
  function close() {
    if (!inFlight.current) onClose();
  }
  async function save() {
    if (inFlight.current || !changed) return;
    inFlight.current = true;
    setSaving(true);
    setError('');
    try {
      await onSave(selected);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible. Réessaie.');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }
  return (
    <Dialog title="Choisir mon avatar" onClose={close}>
      <div className={styles.preview} role="group" aria-label="Aperçu de l’avatar">
        <ScoutAvatar seed={selected} size={96} />
        <p>{changed ? 'Aperçu · non enregistré' : 'Avatar enregistré'}</p>
      </div>
      <div className={styles.choices} role="group" aria-label="Propositions d’avatars">
        {choices.map((seed, i) => (
          <button
            key={seed}
            type="button"
            className={styles.choice}
            aria-label={`Avatar ${i + 1}`}
            aria-pressed={selected === seed}
            disabled={saving}
            onClick={() => {
              setSelected(seed);
              setError('');
            }}
          >
            <ScoutAvatar seed={seed} size={64} />
            {selected === seed && <Check className={styles.check} size={16} aria-hidden="true" />}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={`button secondary ${styles.shuffle}`}
        disabled={saving}
        onClick={() => {
          setChoices(newChoices());
          setError('');
        }}
      >
        <Shuffle size={17} aria-hidden="true" /> Autres propositions
      </button>
      <p className={styles.feedback} role={error ? 'alert' : 'status'}>
        {error ||
          (saving
            ? 'Enregistrement de ton avatar…'
            : changed
              ? 'Ton aperçu reste sélectionné pendant les nouveaux tirages.'
              : 'Choisis un avatar, puis confirme ton choix.')}
      </p>
      <div className={styles.actions}>
        <button type="button" className="button secondary" disabled={saving} onClick={close}>
          Annuler
        </button>
        <button
          type="button"
          className="button primary"
          disabled={saving || !changed}
          onClick={() => void save()}
        >
          {saving ? 'Enregistrement…' : 'Utiliser cet avatar'}
        </button>
      </div>
    </Dialog>
  );
}
