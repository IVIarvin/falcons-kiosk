'use client';
export const authEvent = 'falcons-auth-change';
function announceAuthChange() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(authEvent, crypto.randomUUID());
  } catch {}
  window.dispatchEvent(new Event(authEvent));
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code = 'NETWORK',
  ) {
    super(message);
  }
}
export async function api<T = unknown>(action: string, data?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api/action', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data }),
    });
  } catch {
    throw new ApiError('Connexion interrompue. Vérifie ton réseau avant de réessayer.');
  }
  const result = await response.json().catch(() => null);
  if (!result?.ok) {
    if (
      response.status === 401 &&
      !['login', 'register', 'reset'].includes(action) &&
      typeof window !== 'undefined'
    )
      window.dispatchEvent(new Event(authEvent));
    throw new ApiError(
      result?.message ?? 'Réponse interrompue. Vérifie la confirmation avant de recommencer.',
      response.status,
      result?.code,
    );
  }
  if (['login', 'register', 'logout', 'password', 'reset'].includes(action)) announceAuthChange();
  return result.data as T;
}
export function pendingAction(action: string, userId: string): Record<string, unknown> | null {
  try {
    return JSON.parse(sessionStorage.getItem(`falcons_pending_${userId}_${action}`) ?? 'null');
  } catch {
    return null;
  }
}
export async function durableAction<T>(
  action: string,
  userId: string,
  input?: Record<string, unknown>,
): Promise<T> {
  const key = `falcons_pending_${userId}_${action}`;
  let data = pendingAction(action, userId);
  if (data && input) {
    const { idempotencyKey, ...old } = data;
    if (JSON.stringify(old) !== JSON.stringify(input))
      throw new ApiError(
        'Une opération attend encore sa confirmation. Retrouve-la avant d’en créer une autre.',
        409,
        'PENDING',
      );
  }
  if (!data) {
    if (!input) throw new ApiError('Aucune opération en attente.');
    data = { ...input, idempotencyKey: crypto.randomUUID() };
    sessionStorage.setItem(key, JSON.stringify(data));
  }
  try {
    const result = await api<T>(action, data);
    sessionStorage.removeItem(key);
    return result;
  } catch (e) {
    if (
      e instanceof ApiError &&
      [400, 409].includes(e.status) &&
      ['INVALID', 'PRICE_CHANGED'].includes(e.code)
    )
      sessionStorage.removeItem(key);
    throw e;
  }
}
export function clearPrivateState() {
  for (const key of Object.keys(sessionStorage))
    if (key.startsWith('falcons_')) sessionStorage.removeItem(key);
}
