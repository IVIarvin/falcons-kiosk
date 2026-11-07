'use client';
import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ReceiptText, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '@/components/context';
import { Empty, PageTitle } from '@/components/ui';
import { formatCHF } from '@/lib/money';
import type { AccountLedger } from '@/lib/types';
export function LedgerList({
  ledger,
  onReverse,
}: {
  ledger: AccountLedger;
  onReverse?: (id: string, kind: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!ledger.entries.length)
    return (
      <Empty title="Aucune opération.">Les consommations et les règlements apparaîtront ici.</Empty>
    );
  return (
    <div className="ledger-list">
      {ledger.entries.map((e) => (
        <article key={e.id} className={`ledger-row ${e.voided ? 'voided' : ''}`}>
          <div className="ledger-icon">
            {e.kind === 'consumption' ? (
              <ReceiptText size={22} />
            ) : e.kind === 'payment' ? (
              <ArrowDownLeft size={22} />
            ) : (
              <ArrowUpRight size={22} />
            )}
          </div>
          <div className="ledger-main">
            <strong>
              {e.label}
              {e.voided && <span className="status">Annulé</span>}
            </strong>
            <span>
              {new Date(e.at).toLocaleString('fr-CH', {
                timeZone: 'Europe/Zurich',
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
            {e.reason && <small>{e.reason}</small>}
            {expanded === e.id && e.lines && (
              <ul>
                {e.lines.map((l, i) => (
                  <li key={i}>
                    {l.quantity} × {l.name}
                    <span>{formatCHF(l.quantity * l.priceCents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="ledger-end">
            <strong className={e.kind === 'payment' ? 'accent' : ''}>
              {e.kind === 'payment' ? '−' : '+'}
              {formatCHF(e.cents)}
            </strong>
            <div>
              {e.lines && (
                <button
                  className="text-button"
                  onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                  aria-label="Afficher le détail"
                >
                  Détail {expanded === e.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
              {onReverse && !e.voided && (
                <button className="text-button danger-text" onClick={() => onReverse(e.id, e.kind)}>
                  Corriger
                </button>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
export function ArdoiseView() {
  const { state } = useApp();
  const due = state.ledger.balanceCents;
  return (
    <>
      <PageTitle
        title="Mon ardoise"
        subtitle="Chaque consommation et chaque règlement, au même endroit."
      />
      <div className="account-balance">
        <span>{due < 0 ? 'Ton avoir disponible' : 'Ton solde à régler'}</span>
        <strong>{formatCHF(Math.abs(due))}</strong>
        <p>
          {due < 0
            ? 'Cet avoir sera déduit de tes prochains achats.'
            : due === 0
              ? 'Ton ardoise est à jour.'
              : 'Règle auprès du responsable, qui confirmera la réception dans l’application.'}
        </p>
      </div>
      <h2 className="section-heading">Historique</h2>
      <LedgerList ledger={state.ledger} />
    </>
  );
}
