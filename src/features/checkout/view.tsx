'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Minus, Check, ArrowRight, ShoppingBag, RefreshCw } from 'lucide-react';
import { useApp } from '@/components/context';
import { Empty, Busy, PageTitle } from '@/components/ui';
import { formatCHF } from '@/lib/money';
import { ApiError, durableAction, pendingAction } from '@/lib/client';
import type { CheckoutReceipt } from '@/lib/types';
import { PillerComment } from '@/features/piller/panel';
import { ProductImage, ProductAttribution } from '@/features/catalog/image';
export function KioskView() {
  const { state, refresh, notice } = useApp();
  const [category, setCategory] = useState('Tout');
  const [cart, setCart] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(`falcons_cart_${state.user.id}`) ?? '{}');
    } catch {
      return {};
    }
  });
  const [working, setWorking] = useState(false);
  const [receipt, setReceipt] = useState<CheckoutReceipt | null>(null);
  const [pending, setPending] = useState(!!pendingAction('checkout', state.user.id));
  const gate = useRef(false);
  const receiptRef = useRef<HTMLElement>(null);
  useEffect(() => {
    sessionStorage.setItem(`falcons_cart_${state.user.id}`, JSON.stringify(cart));
  }, [cart, state.user.id]);
  useEffect(() => {
    if (receipt)
      receiptRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
        block: 'center',
      });
  }, [receipt]);
  const products = state.products.filter((p) => p.active);
  useEffect(() => {
    const allowed = new Set(state.products.filter((p) => p.active && p.available).map((p) => p.id));
    const remaining = Object.fromEntries(Object.entries(cart).filter(([id]) => allowed.has(id)));
    if (Object.keys(remaining).length !== Object.keys(cart).length) {
      setCart(remaining);
      notice('Un produit devenu indisponible a été retiré du panier.');
    }
  }, [state.products, cart, notice]);
  const selected = products.filter((p) => cart[p.id] > 0);
  const total = selected.reduce((s, p) => s + p.price_cents * cart[p.id], 0);
  const count = selected.reduce((s, p) => s + cart[p.id], 0);
  function quantity(id: string, delta: number) {
    setReceipt(null);
    setCart((old) => ({ ...old, [id]: Math.max(0, Math.min(1000, (old[id] ?? 0) + delta)) }));
  }
  async function confirm(resume = false) {
    if (gate.current) return;
    gate.current = true;
    setWorking(true);
    try {
      const input = resume
        ? undefined
        : {
            lines: selected.map((p) => ({
              productId: p.id,
              quantity: cart[p.id],
              expectedPriceCents: p.price_cents,
            })),
          };
      const result = await durableAction<CheckoutReceipt>('checkout', state.user.id, input);
      setCart({});
      setReceipt(result);
      await refresh();
    } catch (e) {
      notice((e as Error).message);
      if (e instanceof ApiError && e.code === 'PRICE_CHANGED') await refresh();
    } finally {
      setPending(!!pendingAction('checkout', state.user.id));
      setWorking(false);
      gate.current = false;
    }
  }
  const categories = ['Tout', ...new Set(products.map((p) => p.category))];
  return (
    <>
      <PageTitle title="Kiosque">
        <span className="section-tag">Éclaireurs · Falcons</span>
      </PageTitle>
      <Link className="balance-strip" href="/ardoise">
        <ShoppingBag size={23} />
        <span>Mon ardoise</span>
        <strong>{formatCHF(state.ledger.balanceCents)}</strong>
        <ArrowRight size={20} />
      </Link>
      <div className="category-tabs" role="group" aria-label="Catégories">
        {categories.map((c) => (
          <button
            key={c}
            className={c === category ? 'selected' : ''}
            onClick={() => setCategory(c)}
            aria-pressed={c === category}
          >
            {c}
          </button>
        ))}
      </div>
      {pending && (
        <div className="notice-box">
          <p>Un achat attend sa confirmation. Vérifie-le avant de reprendre.</p>
          <button
            className="button secondary"
            disabled={working}
            onClick={() => void confirm(true)}
          >
            <RefreshCw size={16} /> Retrouver ma confirmation
          </button>
        </div>
      )}
      {!products.length ? (
        <Empty title="Le kiosque se prépare.">
          Le responsable ajoutera bientôt les premiers produits.
        </Empty>
      ) : (
        <div className="product-grid">
          {products
            .filter((p) => category === 'Tout' || p.category === category)
            .map((p) => (
              <article key={p.id} className={`product-card ${!p.available ? 'unavailable' : ''}`}>
                <div className="product-image">
                  <ProductImage src={p.image} name={p.name} />
                </div>
                <ProductAttribution image={p.image} details={p.details} />
                <h2>{p.name}</h2>
                <span className="product-unit">{p.unit}</span>
                <div className="product-footer">
                  <strong>{formatCHF(p.price_cents)}</strong>
                  {!p.available ? (
                    <span className="muted">Indisponible</span>
                  ) : cart[p.id] > 0 ? (
                    <div className="quantity">
                      <button
                        className="icon-button"
                        disabled={working || pending}
                        aria-label={`Retirer un ${p.name}`}
                        onClick={() => quantity(p.id, -1)}
                      >
                        <Minus size={17} />
                      </button>
                      <output aria-label={`Quantité ${p.name}`}>{cart[p.id]}</output>
                      <button
                        className="icon-button"
                        disabled={working || pending}
                        aria-label={`Ajouter un ${p.name}`}
                        onClick={() => quantity(p.id, 1)}
                      >
                        <Plus size={17} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="add-button"
                      disabled={working || pending}
                      onClick={() => quantity(p.id, 1)}
                      aria-label={`Ajouter ${p.name}`}
                    >
                      <Plus size={22} />
                    </button>
                  )}
                </div>
              </article>
            ))}
        </div>
      )}
      {receipt ? (
        <section className="receipt-panel" ref={receiptRef} aria-live="polite">
          <div className="receipt-title">
            <Check size={32} />
            <div>
              <h2>Achat enregistré</h2>
              <p>{formatCHF(receipt.totalCents)} ajoutés à ton ardoise.</p>
            </div>
          </div>
          {receipt.quoteId && (
            <PillerComment
              quoteId={receipt.quoteId}
              text={receipt.quoteText ?? undefined}
              auto={!receipt.replay}
            />
          )}
          <button className="button primary full" onClick={() => setReceipt(null)}>
            Continuer <ArrowRight size={18} />
          </button>
        </section>
      ) : (
        count > 0 &&
        !pending && (
          <div className="basket-bar">
            <div>
              <strong>
                {count} article{count > 1 ? 's' : ''}
              </strong>
              <span>{formatCHF(total)}</span>
            </div>
            <button className="button primary" disabled={working} onClick={() => void confirm()}>
              {working ? (
                <Busy />
              ) : (
                <>
                  Ajouter à mon ardoise <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        )
      )}
    </>
  );
}
