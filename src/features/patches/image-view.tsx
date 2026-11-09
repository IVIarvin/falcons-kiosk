'use client';
import { useState, type ChangeEvent } from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';
import { useApp } from '@/components/context';
import { Dialog, Field } from '@/components/ui';
import { authEvent } from '@/lib/client';
import type { PatchCampaign } from './service';
import { patchImageKinds, patchImageLabels, type PatchImageKind } from './media';
import styles from './image-view.module.css';

export function PatchGallery({ campaign }: { campaign: PatchCampaign }) {
  const kinds = patchImageKinds.filter((kind) => campaign.images[kind]);
  if (!kinds.length) return null;
  return (
    <div className={styles.gallery}>
      {kinds.map((kind) => (
        <figure key={`${kind}-${campaign.images[kind]}`}>
          <figcaption>{patchImageLabels[kind]}</figcaption>
          <a
            className={styles.frame}
            href={campaign.images[kind]!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Agrandir ${patchImageLabels[kind]} du patch ${campaign.name}`}
          >
            <img
              src={campaign.images[kind]!}
              alt={`${patchImageLabels[kind]} du patch ${campaign.name}`}
              loading="lazy"
            />
            <ExternalLink size={16} className={styles.expand} aria-hidden="true" />
          </a>
        </figure>
      ))}
    </div>
  );
}

export function PatchImageEditor({
  campaign,
  onClose,
}: {
  campaign: PatchCampaign;
  onClose: () => void;
}) {
  const { refresh } = useApp();
  const [working, setWorking] = useState<PatchImageKind | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function request(kind: PatchImageKind, file?: File) {
    if (working) return;
    if (file && file.size > 2 * 1024 * 1024) {
      setError('Choisis une image de 2 Mo maximum.');
      return;
    }
    setWorking(kind);
    setError('');
    setMessage('');
    try {
      const body = file ? new FormData() : undefined;
      if (file) body!.set('file', file);
      const response = await fetch(
        `/api/patchs/${encodeURIComponent(campaign.id)}/images/${kind}`,
        { method: file ? 'POST' : 'DELETE', body, credentials: 'same-origin' },
      );
      if (response.status === 401) window.dispatchEvent(new Event(authEvent));
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.message ?? 'Impossible d’enregistrer cette image.');
      await refresh();
      setMessage(`${patchImageLabels[kind]} ${file ? 'enregistré' : 'retiré'}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion interrompue. Réessaie.');
    } finally {
      setWorking(null);
    }
  }
  function choose(kind: PatchImageKind, event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (file) void request(kind, file);
    input.value = '';
  }
  return (
    <Dialog
      title="Images du patch"
      onClose={() => {
        if (!working) onClose();
      }}
    >
      <p className={styles.help}>{campaign.name} · PNG, JPEG ou WebP, 2 Mo maximum par image.</p>
      <div className={styles.editor}>
        {patchImageKinds.map((kind) => (
          <section key={kind}>
            <h3>{patchImageLabels[kind]}</h3>
            {campaign.images[kind] ? (
              <img
                className={styles.preview}
                src={campaign.images[kind]!}
                alt={`${patchImageLabels[kind]} actuel`}
              />
            ) : (
              <div className={styles.empty}>Aucune image</div>
            )}
            <Field label={`Image ${patchImageLabels[kind]}`}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={!!working}
                onChange={(event) => choose(kind, event)}
              />
            </Field>
            {campaign.images[kind] && (
              <button
                className="button secondary"
                disabled={!!working}
                onClick={() => void request(kind)}
              >
                <Trash2 size={16} /> Retirer {patchImageLabels[kind]}
              </button>
            )}
          </section>
        ))}
      </div>
      {working && (
        <p role="status" className={styles.help}>
          Traitement de l’image {patchImageLabels[working]}…
        </p>
      )}
      {message && (
        <p role="status" className={styles.help}>
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <button
        className={`button primary full ${styles.done}`}
        disabled={!!working}
        onClick={onClose}
      >
        Terminé
      </button>
    </Dialog>
  );
}
