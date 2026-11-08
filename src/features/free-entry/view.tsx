'use client';
import { useState, type FormEvent } from 'react';
import { Plus, Check, RefreshCw } from 'lucide-react';
import { useApp } from '@/components/context';
import { Dialog, Field, Busy } from '@/components/ui';
import { centsFromInput, formatCHF } from '@/lib/money';
import { durableAction, pendingAction } from '@/lib/client';
import type { CheckoutReceipt } from '@/lib/types';
import { productCategories } from '@/features/catalog/categories';
import { PillerComment } from '@/features/piller/panel';
import styles from './view.module.css';

export function FreeEntryButton() {
  const { state, refresh } = useApp();
  const saved = pendingAction('freeCheckout', state.user.id);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(String(saved?.name ?? ''));
  const [category, setCategory] = useState(String(saved?.category ?? 'Autre'));
  const [quantity, setQuantity] = useState(String(saved?.quantity ?? 1));
  const [price, setPrice] = useState(saved ? String(Number(saved.priceCents) / 100) : '');
  const [working, setWorking] = useState(false);
  const [pending, setPending] = useState(!!saved);
  const [receipt, setReceipt] = useState<CheckoutReceipt | null>(null);
  const [error, setError] = useState('');
  let total: number | null = null;
  try {
    const q = Number(quantity);
    if (price.trim() && Number.isInteger(q) && q > 0 && q <= 1000)
      total = centsFromInput(price) * q;
  } catch {}
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (working) return;
    setWorking(true);
    setError('');
    try {
      const result = await durableAction<CheckoutReceipt>(
        'freeCheckout',
        state.user.id,
        pending
          ? undefined
          : { name, category, quantity: Number(quantity), priceCents: centsFromInput(price) },
      );
      setReceipt(result);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(!!pendingAction('freeCheckout', state.user.id));
      setWorking(false);
    }
  }
  function close() {
    if (working) return;
    setOpen(false);
    setError('');
    if (receipt) {
      setReceipt(null);
      setName('');
      setQuantity('1');
      setPrice('');
    }
  }
  return (
    <>
      <div className={styles.entry}>
        <button className="button secondary" onClick={() => setOpen(true)}>
          {pending ? <RefreshCw size={17} /> : <Plus size={17} />}
          {pending ? 'Retrouver l’article libre' : 'Article manquant ?'}
        </button>
      </div>
      {open && (
        <Dialog title={receipt ? 'Article ajouté' : 'Article libre'} onClose={close}>
          {receipt ? (
            <>
              <p className={styles.confirmation}>
                <Check size={25} /> {formatCHF(receipt.totalCents)} ajoutés à ton ardoise.
              </p>
              <p className="muted">
                {name} · {quantity} article{Number(quantity) > 1 ? 's' : ''}
              </p>
              {receipt.quoteId && (
                <PillerComment
                  quoteId={receipt.quoteId}
                  text={receipt.quoteText ?? undefined}
                  auto={!receipt.replay}
                />
              )}
              <button className={`button primary full ${styles.finish}`} onClick={close}>
                Terminé
              </button>
            </>
          ) : (
            <form onSubmit={submit}>
              <p className={styles.help}>
                Un produit absent du catalogue ? Son montant sera ajouté à ton ardoise.
              </p>
              <fieldset disabled={working || pending} className={styles.fields}>
                <Field label="Nom de l’article">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="off"
                  />
                </Field>
                <Field label="Famille">
                  <select
                    aria-label="Famille"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Autre">Autre article</option>
                    {productCategories.map((c) => (
                      <option key={c.label} value={c.label}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="form-grid">
                  <Field label="Quantité">
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      step={1}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Prix unitaire (CHF)">
                    <input
                      inputMode="decimal"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                  </Field>
                </div>
              </fieldset>
              <div className={styles.total} role="status" aria-label="Total de l’article libre">
                <span>Total</span>
                <strong>{total === null ? 'À renseigner' : formatCHF(total)}</strong>
              </div>
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              <button
                className="button primary full"
                disabled={working || (!pending && total === null)}
              >
                {working ? <Busy /> : pending ? 'Retrouver l’ajout' : 'Ajouter à mon ardoise'}
              </button>
            </form>
          )}
        </Dialog>
      )}
    </>
  );
}
