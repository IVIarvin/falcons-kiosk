'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Minus, Check, ArrowRight, ShoppingBag, RefreshCw, Search, Star } from 'lucide-react';
import { useApp } from '@/components/context';
import { Empty, Busy, PageTitle } from '@/components/ui';
import { formatCHF } from '@/lib/money';
import { ApiError, durableAction, pendingAction } from '@/lib/client';
import type { Product, CheckoutReceipt } from '@/lib/types';
import { PillerComment } from '@/features/piller/panel';
import { ProductImage, ProductAttribution } from '@/features/catalog/image';
import { matchesProductSearch } from '@/features/catalog/browse';
import { productCategories } from '@/features/catalog/categories';
import styles from './browse.module.css';
import { FreeEntryButton } from '@/features/free-entry/view';
import { ServiceTicketDialog, ServiceRecovery } from '@/features/service-tickets/view';
import serviceStyles from '@/features/service-tickets/view.module.css';
import { FavoriteButton, useProductFavorites } from './favorites';
export function KioskView() {
  const { state, refresh, notice } = useApp();
  const [serviceProduct, setServiceProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState('Tout');
  const [search, setSearch] = useState('');
  const { ids: favorites, toggle: toggleFavorite } = useProductFavorites(state.user.id);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
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
    const allowed = new Set(state.products.filter((p) => p.active).map((p) => p.id));
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
  const categories = [
    { label: 'Tout', shortLabel: 'Tout' },
    ...productCategories.filter((c) => products.some((p) => p.category === c.label)),
  ];
  const visible = products.filter(
    (p) =>
      (!favoritesOnly || favorites.has(p.id)) &&
      (category === 'Tout' || p.category === category) &&
      matchesProductSearch(p, search),
  );
  const favoriteCount = products.filter((p) => favorites.has(p.id)).length;
  const photoCredits = visible.filter((p) => p.image && p.details.source?.image === p.image);
  return (
    <>
      <PageTitle title="Kiosque">
        {state.user.role === 'admin' && (
          <Link className="button secondary" href="/admin/service">
            Contrôle du service
          </Link>
        )}
      </PageTitle>
      {state.user.role === 'admin' && !serviceProduct && <ServiceRecovery />}
      {state.user.role === 'admin' && serviceProduct && (
        <ServiceTicketDialog product={serviceProduct} onClose={() => setServiceProduct(null)} />
      )}
      <Link className="balance-strip" href="/ardoise">
        <ShoppingBag size={23} />
        <span>Mon ardoise</span>
        <strong>{formatCHF(state.ledger.balanceCents)}</strong>
        <ArrowRight size={20} />
      </Link>
      <div className={styles.searchTools}>
        <div className={`search-field ${styles.search}`}>
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            inputMode="search"
            aria-label="Rechercher un produit"
            placeholder="Coca, chips…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(favoriteCount > 0 || favoritesOnly) && (
          <button
            className={`button secondary ${styles.favoriteFilter}`}
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((v) => !v)}
          >
            <Star size={17} />
            Favoris
          </button>
        )}
      </div>
      <div className={`category-tabs ${styles.filters}`} role="group" aria-label="Catégories">
        {categories.map((c) => (
          <button
            key={c.label}
            className={c.label === category ? 'selected' : ''}
            onClick={() => setCategory(c.label)}
            aria-pressed={c.label === category}
            aria-label={c.label}
          >
            {c.shortLabel}
          </button>
        ))}
      </div>
      <FreeEntryButton />
      {pending && (
        <div className="notice-box">
          <p>Un achat attend confirmation.</p>
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
      ) : !visible.length ? (
        <Empty title="Aucun produit trouvé.">
          <button
            className="text-button"
            onClick={() => {
              setSearch('');
              setCategory('Tout');
              setFavoritesOnly(false);
            }}
          >
            Tout afficher
          </button>
        </Empty>
      ) : (
        <div className="product-grid">
          {visible.map((p) => (
            <article key={p.id} className={`product-card ${styles.card}`}>
              <FavoriteButton
                name={p.name}
                selected={favorites.has(p.id)}
                onClick={() => toggleFavorite(p.id)}
              />
              <div className="product-image">
                <ProductImage src={p.image} name={p.name} />
              </div>
              <h2>{p.name}</h2>
              <span className="product-unit">{p.unit === 'pièce' ? '' : p.unit}</span>
              <div className="product-footer">
                <strong>{formatCHF(p.price_cents)}</strong>
                {cart[p.id] > 0 ? (
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
              {state.user.role === 'admin' && (
                <button
                  className={`button secondary ${serviceStyles.serveButton}`}
                  aria-label={`Servir ${p.name}`}
                  onClick={() => setServiceProduct(p)}
                >
                  Servir
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      {photoCredits.length > 0 && (
        <details className={styles.credits}>
          <summary>Crédits photos</summary>
          {photoCredits.map((p) => (
            <div key={p.id}>
              <strong>{p.name}</strong>
              <ProductAttribution image={p.image} details={p.details} />
            </div>
          ))}
        </details>
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
            <div className={styles.summary}>
              <strong>
                {count} article{count > 1 ? 's' : ''}
              </strong>
              <span>{formatCHF(total)}</span>
              <button
                className={`text-button ${styles.clear}`}
                aria-label="Vider le panier"
                disabled={working || pending}
                onClick={() => {
                  setCart({});
                  notice('Panier vidé.');
                }}
              >
                Vider
              </button>
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
