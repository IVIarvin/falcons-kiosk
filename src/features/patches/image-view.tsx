'use client';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';
import { useApp } from '@/components/context';
import { Dialog, Field } from '@/components/ui';
import type { PatchCampaign } from './service';
import { patchImageKinds, patchImageLabels, type PatchImageKind } from './media';
import styles from './image-view.module.css';
import { updatePatchImage } from './image-client';

export type PatchImageFiles = Partial<Record<PatchImageKind, File>>;
function PatchImageChoice({
  kind,
  file,
  onChange,
}: {
  kind: PatchImageKind;
  file?: File;
  onChange: (kind: PatchImageKind, file?: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file && input.current) input.current.value = '';
  }, [file]);
  return (
    <section>
      <Field
        label={`Image ${patchImageLabels[kind]}`}
        hint={kind === 'artwork' ? 'Le visuel original.' : 'Le rendu du patch imprimé ou brodé.'}
      >
        <input
          ref={input}
          type="file"
          aria-label={`Image ${patchImageLabels[kind]}`}
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const chosen = event.currentTarget.files?.[0];
            onChange(kind, chosen);
            if (chosen && chosen.size > 2 * 1024 * 1024) event.currentTarget.value = '';
          }}
        />
      </Field>
      {file && (
        <>
          <SelectedImage file={file} kind={kind} />
          <button type="button" className="button secondary" onClick={() => onChange(kind)}>
            <Trash2 size={16} /> Retirer la sélection {patchImageLabels[kind]}
          </button>
        </>
      )}
    </section>
  );
}
function SelectedImage({ file, kind }: { file: File; kind: PatchImageKind }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url ? (
    <img className={styles.preview} src={url} alt={`Aperçu ${patchImageLabels[kind]}`} />
  ) : null;
}
export function PatchImagePicker({
  files,
  onChange,
  disabled,
}: {
  files: PatchImageFiles;
  onChange: (kind: PatchImageKind, file?: File) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className={styles.picker} disabled={disabled}>
      <legend>
        Images du patch <span>(facultatives)</span>
      </legend>
      <p className={styles.help}>
        PNG, JPEG ou WebP · 2 Mo maximum par image. Les deux images seront visibles par les membres.
      </p>
      <div className={styles.editor}>
        {patchImageKinds.map((kind) => (
          <PatchImageChoice key={kind} kind={kind} file={files[kind]} onChange={onChange} />
        ))}
      </div>
    </fieldset>
  );
}

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
  initialError = '',
}: {
  campaign: PatchCampaign;
  onClose: () => void;
  initialError?: string;
}) {
  const { refresh } = useApp();
  const [working, setWorking] = useState<PatchImageKind | null>(null);
  const [error, setError] = useState(initialError);
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
      await updatePatchImage(campaign.id, kind, file);
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
