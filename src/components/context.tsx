'use client';
import { createContext, useContext } from 'react';
import type { Snapshot } from '@/lib/application';
export type AppContextValue = {
  state: Snapshot;
  busy: boolean;
  refresh: () => Promise<void>;
  run: <T = unknown>(action: string, data?: unknown, reload?: boolean) => Promise<T>;
  notice: (message: string) => void;
};
export const AppContext = createContext<AppContextValue | null>(null);
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('App context absent');
  return ctx;
}
