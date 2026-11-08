'use client';
import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import styles from './favorites.module.css';
function read(key: string): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(raw)
      ? raw.filter((id): id is string => typeof id === 'string' && id.length <= 100).slice(0, 300)
      : [];
  } catch {
    return [];
  }
}
export function useProductFavorites(userId: string) {
  const key = `falcons_favorites_${userId}`;
  const [ids, setIds] = useState(() => new Set(read(key)));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify([...ids]));
    } catch {}
  }, [key, ids]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === key) setIds(new Set(read(key)));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [key]);
  return {
    ids,
    toggle: (id: string) =>
      setIds((old) => {
        const next = new Set(old);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
  };
}
export function FavoriteButton({
  name,
  selected,
  onClick,
}: {
  name: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`icon-button ${styles.favorite}`}
      aria-pressed={selected}
      aria-label={selected ? `Retirer ${name} des favoris` : `Mettre ${name} en favori`}
      onClick={onClick}
    >
      <Star size={18} fill={selected ? 'currentColor' : 'none'} />
    </button>
  );
}
