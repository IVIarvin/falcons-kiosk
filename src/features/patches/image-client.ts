'use client';
import { authEvent } from '@/lib/client';
import type { PatchImageKind } from './media';

export async function updatePatchImage(campaignId: string, kind: PatchImageKind, file?: File) {
  const body = file ? new FormData() : undefined;
  if (file) body!.set('file', file);
  let response: Response;
  try {
    response = await fetch(`/api/patchs/${encodeURIComponent(campaignId)}/images/${kind}`, {
      method: file ? 'POST' : 'DELETE',
      body,
      credentials: 'same-origin',
    });
  } catch {
    throw new Error('Connexion interrompue. Réessaie.');
  }
  if (response.status === 401) window.dispatchEvent(new Event(authEvent));
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok)
    throw new Error(result?.message ?? 'Impossible d’enregistrer cette image. Réessaie.');
}
