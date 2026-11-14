'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ReceiptText, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '@/components/context';
import { Busy, Dialog, Empty, Field, PageTitle } from '@/components/ui';
import { formatCHF } from '@/lib/money';
import type { AccountLedger, LedgerEntry } from '@/lib/types';
import { durableAction, pendingAction } from '@/lib/client';
type LedgerLine = NonNullable<LedgerEntry['lines']>[number];
export function LedgerList({
  ledger,
  onReverse,
  onRemove,
  removalDisabled = false,
}: {
  ledger: AccountLedger;
  onReverse?: (id: string, kind: string) => void;
  onRemove?: (line: LedgerLine) => void;
  removalDisabled?: boolean;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!onRemove) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [onRemove]);
  if (!ledger.entries.length)
    return (
      <Empty title="Aucune opération.">Les consommations et les règlements apparaîtront ici.</Empty>
    );
  return (
    <div className="ledger-list">
      {ledger.entries.map((e) => {
        const removable =
          !!onRemove && !e.voided && !!e.removableUntil && now < Date.parse(e.removableUntil);
        const showLines = expanded[e.id] ?? removable;
        return (
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
                    onClick={() => setExpanded((old) => ({ ...old, [e.id]: !showLines }))}
                    aria-label="Afficher le détail"
                    aria-expanded={showLines}
                    aria-controls={`ledger-detail-${e.id}`}
                  >
                    Détail {showLines ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}
                {onReverse && !e.voided && (
                  <button
                    className="text-button danger-text"
                    onClick={() => onReverse(e.id, e.kind)}
                  >
                    Corriger
                  </button>
                )}
              </div>
            </div>
            {showLines && e.lines && (
              <div className="ledger-detail" id={`ledger-detail-${e.id}`}>
                <ul>
                  {e.lines.map((l) => (
                    <li key={l.id}>
                      <div>
                        <strong>
                          {l.quantity - l.removedQuantity} × {l.name}
                        </strong>
                        {l.removedQuantity > 0 && (
                          <small>
                            {l.removedQuantity} retiré{l.removedQuantity > 1 ? 's' : ''} ·{' '}
                            {l.quantity} ajouté{l.quantity > 1 ? 's' : ''} au départ
                          </small>
                        )}
                      </div>
                      <span>{formatCHF((l.quantity - l.removedQuantity) * l.priceCents)}</span>
                      {removable && l.quantity > l.removedQuantity && (
                        <button
                          disabled={removalDisabled}
                          className="text-button danger-text"
                          onClick={() => onRemove!(l)}
                          aria-label={`Retirer ${l.name} de mon ardoise`}
                        >
                          Retirer
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {removable && (
                  <p>
                    Retrait possible encore{' '}
                    {Math.max(1, Math.ceil((Date.parse(e.removableUntil!) - now) / 60000))} min.
                  </p>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
export function ArdoiseView() {
  const { state, refresh, notice } = useApp();
  const [removing, setRemoving] = useState<LedgerLine | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(!!pendingAction('removeConsumptionLine', state.user.id));
  const gate = useRef(false);
  async function remove(resume = false) {
    if (gate.current || (!resume && !removing)) return;
    gate.current = true;
    setWorking(true);
    setError('');
    try {
      await durableAction(
        'removeConsumptionLine',
        state.user.id,
        resume ? undefined : { lineId: removing!.id, quantity },
      );
      setRemoving(null);
      await refresh();
      notice('Article retiré de ton ardoise. La correction reste dans l’historique.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(!!pendingAction('removeConsumptionLine', state.user.id));
      setWorking(false);
      gate.current = false;
    }
  }
  const due = state.ledger.balanceCents;
  return (
    <>
      <PageTitle title="Mon ardoise" />
      <div className="account-balance">
        <span>{due < 0 ? 'Avoir disponible' : 'À régler'}</span>
        <strong>{formatCHF(Math.abs(due))}</strong>
        <p>
          {due < 0
            ? 'Cet avoir sera déduit de tes prochains achats.'
            : due === 0
              ? 'Ton ardoise est à jour.'
              : 'Règle auprès d’un admin.'}
        </p>
      </div>
      <h2 className="section-heading">Historique</h2>
      <p className="muted">
        Article non pris : retrait sous 10 min. Pour un patch ou après ce délai, contacte un admin.
      </p>
      {pending && (
        <div className="notice-box">
          <p>Un retrait attend confirmation.</p>
          <button className="button secondary" disabled={working} onClick={() => void remove(true)}>
            Retrouver le retrait
          </button>
        </div>
      )}
      {error && !removing && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <LedgerList
        ledger={state.ledger}
        removalDisabled={pending || working}
        onRemove={(line) => {
          setRemoving(line);
          setQuantity(1);
          setError('');
        }}
      />
      {removing && (
        <Dialog
          title="Retirer de ton ardoise"
          onClose={() => {
            if (!working) setRemoving(null);
          }}
        >
          <p>
            <strong>Confirme la quantité à retirer.</strong>
          </p>
          <p className="muted">Uniquement pour un article non pris. La correction reste visible.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void remove(pending);
            }}
          >
            <Field label={`Quantité à retirer · ${removing.name}`}>
              <input
                type="number"
                min={1}
                max={removing.quantity - removing.removedQuantity}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                disabled={working || pending}
              />
            </Field>
            <p>
              À déduire : <strong>{formatCHF(quantity * removing.priceCents)}</strong>
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="row-actions">
              <button
                type="button"
                className="button secondary"
                disabled={working}
                onClick={() => setRemoving(null)}
              >
                Garder l’article
              </button>
              <button className="button primary" disabled={working}>
                {working ? <Busy /> : pending ? 'Retrouver le retrait' : 'Confirmer le retrait'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
