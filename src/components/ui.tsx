'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { X, ArrowUpRight, RefreshCw } from 'lucide-react';
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M5 9h54L45 23H25L12 34l12-2-9 25 25-29H29l9-7H19z" fill="currentColor" />
      </svg>
      {!compact && <span>FALCONS</span>}
    </span>
  );
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-cross" aria-hidden="true">
        +
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Fermer">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function PageTitle({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="title-actions">{children}</div>}
    </header>
  );
}
export function Busy() {
  return (
    <span className="loading-inline">
      <RefreshCw size={16} className="spin" /> En cours…
    </span>
  );
}
export function DownloadLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="button secondary" href={href}>
      {children}
      <ArrowUpRight size={16} />
    </a>
  );
}
