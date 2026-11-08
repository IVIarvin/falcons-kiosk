'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Search,
  FileText,
  QrCode,
  Check,
  Copy,
  Plus,
  Pencil,
  ArrowUpRight,
  Users,
  Download,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '@/components/context';
import { PageTitle, Empty, Dialog, Field, Busy, DownloadLink } from '@/components/ui';
import { PillerAdminPanel, PillerLibrary } from '@/features/piller/panel';
import { ProductEditor } from '@/features/catalog/editor';
import { AdminDataView } from '@/features/admin-data/view';
import { PatchAdminView } from '@/features/patches/view';
import { ProductImage } from '@/features/catalog/image';
import { kindLabels } from '@/features/catalog/details';
import { LedgerList } from '@/features/ledger/view';
import { centsFromInput, costMicrosFromInput, formatCHF } from '@/lib/money';
import { durableAction, pendingAction } from '@/lib/client';
import type { Product, AccountLedger } from '@/lib/types';
import type { Snapshot, ProcurementRow } from '@/lib/application';

type Account = NonNullable<Snapshot['admin']>['accounts'][number];
const dateInput = () =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date());
const formData = (e: FormEvent<HTMLFormElement>) =>
  Object.fromEntries(new FormData(e.currentTarget));
const dateIso = (value: string) => new Date(`${value}T12:00:00Z`).toISOString();
const doc = (kind: string) => `/api/admin/documents/${kind}`;

export function AdminView({ section }: { section: string }) {
  const { state } = useApp();
  if (!state.admin) return <Empty title="Accès réservé au responsable." />;
  switch (section) {
    case 'patchs':
      return <PatchAdminView />;
    case 'produits':
      return <Products />;
    case 'achats':
      return <Purchases />;
    case 'documents':
      return <Documents />;
    case 'donnees':
      return <AdminDataView />;
    case 'reglages':
      return <Settings />;
    case 'section':
      return <Members />;
    case 'finance':
      return <Finance />;
    default:
      return <Settlements />;
  }
}
function Settlements() {
  const { state, run, refresh, notice, busy } = useApp();
  const admin = state.admin!;
  const [search, setSearch] = useState('');
  const [all, setAll] = useState(false);
  const [payment, setPayment] = useState<Account | null>(null);
  const [account, setAccount] = useState<{ member: Account; ledger: AccountLedger } | null>(null);
  const [correction, setCorrection] = useState<{ id: string; kind: string } | null>(null);
  const [working, setWorking] = useState(false);
  const accounts = admin.accounts.filter(
    (a) =>
      (all || a.balanceCents !== 0) &&
      `${a.grade} ${a.name} ${a.phone}`.toLowerCase().includes(search.toLowerCase()),
  );
  const pending = pendingAction('payment', state.user.id);
  async function receive(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    setWorking(true);
    try {
      const values = e ? formData(e) : null;
      await durableAction(
        'payment',
        state.user.id,
        payment && values
          ? {
              memberId: payment.id,
              cents: centsFromInput(String(values.amount)),
              kind: payment.balanceCents < 0 ? 'refund' : 'payment',
              receivedAt: dateIso(String(values.date)),
            }
          : undefined,
      );
      setPayment(null);
      await refresh();
      notice('Règlement enregistré.');
    } catch (e) {
      notice((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  async function openAccount(member: Account) {
    try {
      const ledger = await run<AccountLedger>('ledger', { memberId: member.id }, false);
      setAccount({ member, ledger });
    } catch {}
  }
  async function correct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!correction) return;
    try {
      await run(correction.kind === 'consumption' ? 'reverseConsumption' : 'voidPayment', {
        id: correction.id,
        reason: formData(e).reason,
      });
      setCorrection(null);
      notice('Correction enregistrée, historique conservé.');
    } catch {}
  }
  return (
    <>
      <PageTitle title="Règlements">
        <DownloadLink href={doc('catalogue')}>
          <FileText size={17} /> Catalogue PDF
        </DownloadLink>
        {admin.canonicalUrl ? (
          <DownloadLink href={doc('qr')}>
            <QrCode size={17} /> Affiche QR
          </DownloadLink>
        ) : (
          <Link className="button secondary" href="/admin/documents">
            <QrCode size={17} /> Affiche QR
          </Link>
        )}
      </PageTitle>
      <div className="admin-grid">
        <section className="settlement-main">
          <div className="ledger-summary">
            <span>{admin.accounts.filter((a) => a.balanceCents > 0).length} comptes à régler</span>
            <strong>{formatCHF(admin.financial.dueCents)} à recevoir</strong>
          </div>
          {pending && (
            <div className="notice-box">
              <p>
                Un règlement attend confirmation. Retrouve cette opération avant un nouvel
                encaissement.
              </p>
              <button
                className="button secondary"
                disabled={working}
                onClick={() => void receive()}
              >
                <RefreshCw size={16} /> Vérifier le règlement
              </button>
            </div>
          )}
          <div className="search-field">
            <Search size={19} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un membre"
              aria-label="Rechercher un membre"
            />
          </div>
          <label className="check-line">
            <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />{' '}
            Afficher aussi les comptes à jour
          </label>
          {!accounts.length ? (
            <Empty title="Aucun compte à régler.">
              {search ? 'Essaie un autre nom.' : 'Les ardoises de la section sont à jour.'}
            </Empty>
          ) : (
            <div className="table-wrap">
              <table className="accounts-table">
                <thead>
                  <tr>
                    <th>Membre</th>
                    <th className="phone-column">Téléphone</th>
                    <th className="number">À régler</th>
                    <th>Paiement</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <button className="member-name" onClick={() => void openAccount(a)}>
                          <span>{a.grade}</span> {a.name}
                          {!a.active && <small>désactivé</small>}
                        </button>
                      </td>
                      <td className="phone-column">
                        <button
                          className="copy-text"
                          onClick={() => {
                            void navigator.clipboard
                              .writeText(a.phone)
                              .then(() => notice('Numéro copié.'))
                              .catch(() => notice(a.phone));
                          }}
                          aria-label={`Copier le numéro de ${a.name}`}
                        >
                          {a.phone}
                          <Copy size={13} />
                        </button>
                      </td>
                      <td className="number">
                        <strong>{formatCHF(a.balanceCents)}</strong>
                        {a.balanceCents < 0 && <small className="accent">Avoir</small>}
                      </td>
                      <td>
                        {a.balanceCents !== 0 ? (
                          <button
                            className="button compact secondary"
                            disabled={busy || working || !!pending}
                            onClick={() => setPayment(a)}
                          >
                            <Check size={15} />
                            {a.balanceCents < 0 ? 'Rembourser' : 'Marquer reçu'}
                          </button>
                        ) : (
                          <span className="status">À jour</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="table-footer">
            <span>
              {accounts.length} membre{accounts.length > 1 ? 's' : ''} affiché
              {accounts.length > 1 ? 's' : ''}
            </span>
            <Link href="/admin/finance">
              Suivi financier <ArrowUpRight size={14} />
            </Link>
          </div>
        </section>
        <PillerAdminPanel />
      </div>
      {payment && (
        <Dialog
          title={payment.balanceCents < 0 ? 'Rembourser un avoir' : 'Confirmer un paiement'}
          onClose={() => {
            if (!working) setPayment(null);
          }}
        >
          <p className="modal-member">
            {payment.grade} <strong>{payment.name}</strong>
          </p>
          <p className="muted">{payment.phone}</p>
          <p>
            {payment.balanceCents < 0
              ? 'Enregistre uniquement un remboursement effectivement envoyé.'
              : 'Enregistre uniquement l’argent effectivement reçu, après vérification dans TWINT.'}
          </p>
          <form onSubmit={(e) => void receive(e)}>
            <Field
              label="Montant en CHF"
              hint={`Maximum : ${formatCHF(Math.abs(payment.balanceCents))}`}
            >
              <input
                name="amount"
                inputMode="decimal"
                defaultValue={(Math.abs(payment.balanceCents) / 100).toFixed(2)}
                required
                disabled={working}
              />
            </Field>
            <Field label={payment.balanceCents < 0 ? 'Date de remboursement' : 'Date de réception'}>
              <input
                name="date"
                type="date"
                defaultValue={dateInput()}
                required
                disabled={working}
              />
            </Field>
            <button className="button primary full" disabled={working}>
              {working ? (
                <Busy />
              ) : payment.balanceCents < 0 ? (
                'Confirmer le remboursement'
              ) : (
                'Confirmer la réception'
              )}
            </button>
          </form>
        </Dialog>
      )}
      {account && (
        <Dialog
          title={`${account.member.grade} ${account.member.name}`}
          onClose={() => setAccount(null)}
        >
          <div className="account-details">
            <span>{account.member.phone}</span>
            <strong>{formatCHF(account.ledger.balanceCents)}</strong>
          </div>
          <LedgerList
            ledger={account.ledger}
            onReverse={(id, kind) => {
              setAccount(null);
              setCorrection({ id, kind });
            }}
          />
        </Dialog>
      )}
      {correction && (
        <Dialog title="Corriger une opération" onClose={() => setCorrection(null)}>
          <p>
            Cette opération sera annulée avec une trace. Un achat déjà réglé peut créer un avoir.
          </p>
          <form onSubmit={correct}>
            <Field label="Motif de correction">
              <textarea name="reason" required minLength={3} maxLength={300} />
            </Field>
            <button className="button primary full" disabled={busy}>
              Confirmer l’annulation
            </button>
          </form>
        </Dialog>
      )}
    </>
  );
}
function Products() {
  const { state } = useApp();
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState('active');
  const p = editing && editing !== 'new' ? editing : null;
  const normalized = (text: string) =>
    text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('fr');
  const query = normalized(search.trim());
  const categories = [...new Set(state.products.map((product) => product.category))].sort((a, b) =>
    a.localeCompare(b, 'fr'),
  );
  const visibleProducts = state.products.filter(
    (product) =>
      (!query || normalized(product.name).includes(query)) &&
      (!category || product.category === category) &&
      (availability === 'all' || product.active === (availability === 'active')),
  );
  function resetFilters(showAll = false) {
    setSearch('');
    setCategory('');
    setAvailability(showAll ? 'all' : 'active');
  }
  return (
    <>
      <PageTitle title="Produits">
        <button className="button primary" onClick={() => setEditing('new')}>
          <Plus size={18} /> Ajouter un produit
        </button>
      </PageTitle>
      {!!state.products.length && (
        <section className="catalogue-filters" aria-label="Filtrer le catalogue">
          <div className="catalogue-filter-fields">
            <Field label="Rechercher un produit">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom du produit"
              />
            </Field>
            <Field label="Catégorie des produits">
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Toutes les catégories</option>
                {categories.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="État des produits">
              <select value={availability} onChange={(e) => setAvailability(e.target.value)}>
                <option value="active">Au catalogue</option>
                <option value="inactive">Désactivés</option>
                <option value="all">Tous les produits</option>
              </select>
            </Field>
          </div>
          <div className="catalogue-filter-result">
            <p role="status">
              {visibleProducts.length} produit{visibleProducts.length > 1 ? 's' : ''} affiché
              {visibleProducts.length > 1 ? 's' : ''} sur {state.products.length}
            </p>
            {(search || category || availability !== 'active') && (
              <button className="text-button" onClick={() => resetFilters()}>
                Réinitialiser les filtres
              </button>
            )}
          </div>
        </section>
      )}
      {!state.products.length ? (
        <Empty title="Le premier ravitaillement t’attend.">
          Ajoute un produit avec son prix de vente.
        </Empty>
      ) : !visibleProducts.length ? (
        <Empty title="Aucun produit ne correspond.">
          Essaie un autre nom ou change la catégorie et l’état des produits.
          <button className="button secondary" onClick={() => resetFilters(true)}>
            Voir tous les produits
          </button>
        </Empty>
      ) : (
        <div className="table-wrap">
          <table className="responsive-records products-table" role="table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Prix de vente</th>
                <th>Prix d’achat / article</th>
                <th>Écart / article</th>
                <th>État</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((p) => (
                <tr key={p.id}>
                  <td className="record-title">
                    <div className="admin-product">
                      <span className="admin-product-image">
                        <ProductImage src={p.image} name={p.name} />
                      </span>
                      <strong>{p.name}</strong>
                    </div>
                    <small>
                      {p.category} · {p.unit}
                      {p.details.kind !== 'unknown' ? ` · ${kindLabels[p.details.kind]}` : ''}
                    </small>
                  </td>
                  <td data-label="Prix de vente">
                    {formatCHF(p.price_cents)}
                    <small>{p.price_mode === 'auto' ? 'Calcul automatique' : 'Prix manuel'}</small>
                  </td>
                  <td data-label="Prix d’achat / article">
                    {p.cost_micros === null ? 'Non renseigné' : formatCHF(p.cost_micros / 10000)}
                  </td>
                  <td data-label="Écart / article">
                    {p.cost_micros === null
                      ? 'À renseigner'
                      : formatCHF(p.price_cents - p.cost_micros / 10000)}
                  </td>
                  <td data-label="État">
                    <span className={`status ${p.active ? 'positive' : ''}`}>
                      {!p.active ? 'Désactivé' : 'Au catalogue'}
                    </span>
                  </td>
                  <td className="record-actions">
                    <button
                      className="icon-button"
                      aria-label={`Modifier ${p.name}`}
                      onClick={() => setEditing(p)}
                    >
                      <Pencil size={17} />
                      <span className="mobile-action-label">Modifier</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <PricePreview />
      {editing && <ProductEditor product={p} onClose={() => setEditing(null)} />}
    </>
  );
}
function PricePreview() {
  const { state, run, busy } = useApp();
  const [open, setOpen] = useState(false);
  const changes = state.admin!.priceChanges;
  if (!changes.length) return null;
  return (
    <div className="notice-box">
      <div>
        <strong>
          {changes.length} nouveau{changes.length > 1 ? 'x' : ''} prix proposé
          {changes.length > 1 ? 's' : ''}
        </strong>
        <p>Les prix actuels restent en vigueur.</p>
      </div>
      <button className="button secondary" onClick={() => setOpen(true)}>
        Vérifier les prix
      </button>
      {open && (
        <Dialog title="Publier les nouveaux prix" onClose={() => setOpen(false)}>
          <div className="price-changes">
            {changes.map((c) => (
              <div key={c.id}>
                <span>{c.name}</span>
                <span>
                  {formatCHF(c.oldPriceCents)} → <strong>{formatCHF(c.newPriceCents)}</strong>
                </span>
              </div>
            ))}
          </div>
          <button
            className="button primary full"
            disabled={busy}
            onClick={() => {
              void run('publishPrices', changes)
                .then(() => setOpen(false))
                .catch(() => {});
            }}
          >
            Publier ces prix
          </button>
        </Dialog>
      )}
    </div>
  );
}
function Purchases() {
  const { state, run, refresh, busy, notice } = useApp();
  const [open, setOpen] = useState(false);
  const [correction, setCorrection] = useState<ProcurementRow | null>(null);
  const [working, setWorking] = useState(false);
  const [draftQuantity, setDraftQuantity] = useState('24');
  const [draftTotal, setDraftTotal] = useState('');
  const [draftProductId, setDraftProductId] = useState(state.products[0]?.id ?? '');
  const draftProduct = state.products.find((p) => p.id === draftProductId);
  const totalPaid = Number(draftTotal.replace(',', '.'));
  const articleCount = Number(draftQuantity);
  const paidPerArticle =
    draftTotal.trim() &&
    totalPaid >= 0 &&
    Number.isFinite(totalPaid) &&
    articleCount > 0 &&
    Number.isInteger(articleCount)
      ? totalPaid / articleCount
      : null;
  const pending = pendingAction('purchase', state.user.id);
  async function save(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    const f = e ? formData(e) : null;
    setWorking(true);
    try {
      const input = f
        ? {
            productId: String(f.productId),
            quantity: Number(f.quantity),
            totalCents: centsFromInput(String(f.total)),
            purchasedAt: dateIso(String(f.date)),
          }
        : undefined;
      if (correction && f)
        await run('correctPurchase', { ...input, id: correction.id, reason: String(f.reason) });
      else {
        await durableAction('purchase', state.user.id, input);
        await refresh();
      }
      setOpen(false);
      setCorrection(null);
      notice('Achat enregistré. Les prix automatiques restent à confirmer.');
    } catch (e) {
      notice((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  return (
    <>
      <PageTitle title="Achats">
        <button
          className="button primary"
          disabled={!state.products.length || working || !!pending}
          onClick={() => {
            setDraftQuantity('24');
            setDraftTotal('');
            setDraftProductId(state.products[0]?.id ?? '');
            setOpen(true);
          }}
        >
          <Plus size={18} /> Enregistrer un achat
        </button>
      </PageTitle>
      {pending && (
        <div className="notice-box">
          <p>Un achat attend confirmation.</p>
          <button className="button secondary" disabled={working} onClick={() => void save()}>
            <RefreshCw size={16} /> Retrouver l’achat
          </button>
        </div>
      )}
      <PricePreview />
      {!state.admin!.purchases.length ? (
        <Empty title="Aucun réapprovisionnement enregistré.">
          Renseigne la quantité vendable et le total payé pour chaque produit.
        </Empty>
      ) : (
        <div className="table-wrap">
          <table className="responsive-records purchases-table" role="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Produit</th>
                <th>Unités</th>
                <th>Total payé</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {state.admin!.purchases.map((p) => (
                <tr key={p.id}>
                  <td data-label="Date">{new Date(p.purchased_at).toLocaleDateString('fr-CH')}</td>
                  <td className="record-title">{p.product_name}</td>
                  <td data-label="Unités">{p.quantity}</td>
                  <td data-label="Total payé" className="record-amount">
                    {formatCHF(p.total_cents)}
                  </td>
                  <td className="record-actions">
                    <button
                      className="icon-button"
                      aria-label={`Corriger l’achat ${p.product_name}`}
                      onClick={() => {
                        setCorrection(p);
                        setDraftQuantity(String(p.quantity));
                        setDraftTotal((p.total_cents / 100).toFixed(2));
                        setDraftProductId(p.product_id);
                        setOpen(true);
                      }}
                    >
                      <Pencil size={17} />
                      <span className="mobile-action-label">Corriger</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <Dialog
          title={correction ? 'Corriger un achat' : 'Enregistrer un achat'}
          onClose={() => {
            if (working) return;
            setOpen(false);
            setCorrection(null);
          }}
        >
          <form onSubmit={save}>
            <Field label="Produit">
              <select
                name="productId"
                value={draftProductId}
                onChange={(e) => setDraftProductId(e.target.value)}
                required
                aria-readonly={!!correction}
              >
                {state.products
                  .filter((p) => !correction || p.id === correction.product_id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.unit}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="form-grid">
              <Field label="Nombre d’articles achetés" hint="2 packs de 24 = 48 articles.">
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  max="100000"
                  value={draftQuantity}
                  onChange={(e) => setDraftQuantity(e.target.value)}
                  required
                />
              </Field>
              <Field
                label="Prix d’achat total payé (CHF)"
                hint="Payé au fournisseur pour le lot complet."
              >
                <input
                  name="total"
                  inputMode="decimal"
                  value={draftTotal}
                  onChange={(e) => setDraftTotal(e.target.value)}
                  required
                />
              </Field>
            </div>
            <div className="price-delta" role="status" aria-label="Coût du ravitaillement">
              <span>Prix payé par article</span>
              <strong>
                {paidPerArticle === null ? 'À renseigner' : formatCHF(paidPerArticle * 100)}
              </strong>
              {draftProduct && (
                <>
                  <span>Vente actuelle au kiosque</span>
                  <strong>{formatCHF(draftProduct.price_cents)}</strong>
                </>
              )}
              {draftProduct && paidPerArticle !== null && (
                <>
                  <span>Écart par article</span>
                  <strong>{formatCHF(draftProduct.price_cents - paidPerArticle * 100)}</strong>
                </>
              )}
              <small>Nouveau tarif à valider séparément.</small>
            </div>
            <Field label="Date d’achat">
              <input
                name="date"
                type="date"
                defaultValue={
                  correction ? String(correction.purchased_at).slice(0, 10) : dateInput()
                }
                required
              />
            </Field>
            {correction && (
              <Field label="Motif de correction">
                <textarea name="reason" required minLength={3} maxLength={300} />
              </Field>
            )}
            <button className="button primary full" disabled={busy || working}>
              {busy || working ? <Busy /> : 'Enregistrer'}
            </button>
          </form>
        </Dialog>
      )}
    </>
  );
}
function Settings() {
  const { state, run, busy, notice } = useApp();
  const settings = state.admin!.settings;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = formData(e);
    try {
      await run('settings', {
        markupBasisPoints: Math.round(Number(String(f.markup).replace(',', '.')) * 100),
        pillerEnabled: f.piller === 'on',
      });
      notice('Réglages enregistrés. Vérifie les prix proposés avant publication.');
    } catch {}
  }
  return (
    <>
      <PageTitle title="Réglages" />
      <div className="admin-more-links">
        <Link className="button secondary" href="/admin/donnees">
          Données
        </Link>
        <Link className="button secondary" href="/admin/patchs">
          Précommandes de patchs <ArrowUpRight size={16} />
        </Link>
        <Link className="button secondary" href="/admin/finance">
          Suivi financier <ArrowUpRight size={16} />
        </Link>
        <Link className="button secondary" href="/admin/documents">
          Documents et exports <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="profile-layout">
        <section className="form-panel">
          <h2>Prix et commentaires</h2>
          <form onSubmit={save}>
            <Field
              label="Majoration générale (%)"
              hint="Achat + majoration, arrondi à CHF 0.05. Prix fixes inchangés."
            >
              <input
                name="markup"
                inputMode="decimal"
                defaultValue={(settings.markupBasisPoints / 100).toString()}
                required
              />
            </Field>
            <label className="switch-label settings-switch">
              <span>Activer Adjudant Piller</span>
              <input
                name="piller"
                type="checkbox"
                role="switch"
                defaultChecked={settings.pillerEnabled}
              />
            </label>
            <p className="muted">
              Une réplique après l’achat. Son désactivable sur chaque téléphone.
            </p>
            <button className="button primary" disabled={busy}>
              {busy ? <Busy /> : 'Enregistrer les réglages'}
            </button>
          </form>
        </section>
        <section className="form-panel">
          <Users size={28} className="accent" />
          <h2>Membres et admins</h2>
          <p>Modifie les rôles et les accès des membres.</p>
          <Link className="button secondary" href="/admin/section">
            Gérer les membres <ArrowUpRight size={16} />
          </Link>
          <h3 className="section-heading">Adresse du kiosque</h3>
          <p className="url-value">
            {state.admin!.canonicalUrl || 'À configurer sur Vercel avant de générer l’affiche QR.'}
          </p>
        </section>
      </div>
      <PillerLibrary />
      <PricePreview />
    </>
  );
}
function Documents() {
  const { state } = useApp();
  return (
    <>
      <PageTitle title="Documents" />
      <div className="document-list">
        <article>
          <FileText size={28} />
          <div>
            <h2>Catalogue du kiosque</h2>
            <p>Produits et prix, au format A4.</p>
          </div>
          <DownloadLink href={doc('catalogue')}>Télécharger le PDF</DownloadLink>
        </article>
        <article>
          <QrCode size={28} />
          <div>
            <h2>Affiche d’accès</h2>
            <p>QR code et adresse du kiosque.</p>
          </div>
          {state.admin!.canonicalUrl ? (
            <DownloadLink href={doc('qr')}>Télécharger l’affiche</DownloadLink>
          ) : (
            <button className="button secondary" disabled>
              Adresse publique à configurer
            </button>
          )}
        </article>
      </div>
      <h2 className="section-heading">Exports administratifs</h2>
      <div className="export-actions">
        {[
          ['comptes', 'Comptes'],
          ['achats', 'Achats'],
          ['consommations', 'Consommations'],
          ['paiements', 'Paiements'],
        ].map(([kind, label]) => (
          <DownloadLink key={kind} href={doc(kind)}>
            <Download size={16} />
            {label} CSV
          </DownloadLink>
        ))}
      </div>
      <div className="backup-panel">
        <ShieldCheck size={25} />
        <div>
          <h2>Sauvegarde des données</h2>
          <p>
            Export complet pour la procédure de restauration. Il contient les coordonnées et les
            empreintes de mots de passe : conserve-le dans un emplacement privé.
          </p>
        </div>
        <DownloadLink href={doc('sauvegarde')}>Exporter la sauvegarde</DownloadLink>
      </div>
      {!state.admin!.canonicalUrl && (
        <p className="muted small">
          Le catalogue est disponible dès maintenant. L’affiche QR sera générable après
          configuration de l’adresse publique du kiosque.
        </p>
      )}
    </>
  );
}
function Members() {
  const { state, run, busy, notice } = useApp();
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState<Account | null>(null);
  const [reset, setReset] = useState<{ member: Account; token: string } | null>(null);
  async function access(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit) return;
    const f = formData(e);
    try {
      await run('memberAccess', {
        id: edit.id,
        role: String(f.role),
        active: f.active === 'on',
        name: String(f.name),
        grade: String(f.grade),
        phone: String(f.phone),
      });
      setEdit(null);
    } catch {}
  }
  return (
    <>
      <PageTitle title="Membres et admins" subtitle="Comptes et accès administrateur." />
      <div className="search-field">
        <Search size={18} />
        <input
          placeholder="Rechercher un membre"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Rechercher un membre"
        />
      </div>
      <div className="table-wrap">
        <table className="members-table">
          <thead>
            <tr>
              <th>Membre</th>
              <th>Téléphone</th>
              <th>Accès</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {state
              .admin!.accounts.filter((a) =>
                `${a.name} ${a.grade} ${a.phone}`.toLowerCase().includes(search.toLowerCase()),
              )
              .map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>
                      {a.grade} {a.name}
                    </strong>
                  </td>
                  <td>{a.phone}</td>
                  <td>
                    {a.role === 'admin' ? 'Administrateur' : 'Membre'}
                    <small>{a.active ? 'Actif' : 'Désactivé'}</small>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="text-button" disabled={busy} onClick={() => setEdit(a)}>
                        Gérer
                      </button>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => {
                          void run<{ token: string }>('resetCode', { memberId: a.id }, false)
                            .then((result) => setReset({ member: a, token: result.token }))
                            .catch(() => {});
                        }}
                      >
                        Récupération
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Dialog title={`Accès de ${edit.name}`} onClose={() => setEdit(null)}>
          <form onSubmit={access}>
            <div className="form-grid">
              <Field label="Grade">
                <input name="grade" defaultValue={edit.grade} required maxLength={30} />
              </Field>
              <Field label="Nom">
                <input name="name" defaultValue={edit.name} required minLength={2} maxLength={90} />
              </Field>
            </div>
            <Field label="Téléphone">
              <input name="phone" type="tel" defaultValue={edit.phone} required />
            </Field>
            <Field label="Rôle" hint="Administrateur : accès complet. Membre : accès au kiosque.">
              <select name="role" defaultValue={edit.role}>
                <option value="member">Membre</option>
                <option value="admin">Administrateur</option>
              </select>
            </Field>
            <label className="check-line">
              <input name="active" type="checkbox" defaultChecked={edit.active} /> Compte actif
            </label>
            <p className="muted">Reconnexion requise. Solde et historique conservés.</p>
            <button className="button primary" disabled={busy}>
              Enregistrer les accès
            </button>
          </form>
        </Dialog>
      )}
      {reset && (
        <Dialog title={`Récupération de ${reset.member.name}`} onClose={() => setReset(null)}>
          <p>
            Remets ce code à la personne après vérification directe de son identité. Il est valable
            15 minutes, une seule fois.
          </p>
          <code className="recovery-code">{reset.token}</code>
          <button
            className="button primary full"
            onClick={() => {
              void navigator.clipboard
                .writeText(reset.token)
                .then(() => notice('Code copié.'))
                .catch(() => notice('Copie indisponible. Sélectionne le code pour le copier.'));
            }}
          >
            Copier le code
          </button>
        </Dialog>
      )}
    </>
  );
}
function Finance() {
  const { state, run, refresh, busy, notice } = useApp();
  const [period, setPeriod] = useState<'week' | 'all'>('week');
  const [expense, setExpense] = useState(false);
  const [working, setWorking] = useState(false);
  const [voiding, setVoiding] = useState<string | null>(null);
  const pending = pendingAction('expense', state.user.id);
  const f = period === 'week' ? state.admin!.weekFinancial : state.admin!.financial;
  const metrics = [
    ['Ventes enregistrées', f.salesCents],
    ['Marge brute estimée', f.marginCents],
    ['Achats de produits', f.purchasesCents],
    ['Paiements reçus', f.receivedCents],
    ['Avoirs remboursés', f.refundedCents],
    ['Autres dépenses', f.expensesCents],
    ['Variation de trésorerie', f.cashChangeCents],
  ] as const;
  async function save(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    const v = e ? formData(e) : null;
    setWorking(true);
    try {
      await durableAction(
        'expense',
        state.user.id,
        v
          ? {
              cents: centsFromInput(String(v.amount)),
              reason: String(v.reason),
              spentAt: dateIso(String(v.date)),
            }
          : undefined,
      );
      await refresh();
      setExpense(false);
      notice('Dépense enregistrée.');
    } catch (e) {
      notice((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  async function cancel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await run('voidExpense', { id: voiding, reason: String(formData(e).reason) });
      setVoiding(null);
      notice('Dépense annulée, historique conservé.');
    } catch {}
  }
  return (
    <>
      <PageTitle title="Suivi financier">
        <button
          className="button secondary"
          disabled={working || !!pending}
          onClick={() => setExpense(true)}
        >
          <Plus size={17} /> Autre dépense
        </button>
      </PageTitle>
      {pending && (
        <div className="notice-box">
          <p>Une dépense attend confirmation.</p>
          <button className="button secondary" disabled={working} onClick={() => void save()}>
            <RefreshCw size={16} /> Retrouver la dépense
          </button>
        </div>
      )}
      <div className="category-tabs">
        <button className={period === 'week' ? 'selected' : ''} onClick={() => setPeriod('week')}>
          Cette semaine
        </button>
        <button className={period === 'all' ? 'selected' : ''} onClick={() => setPeriod('all')}>
          Depuis le début
        </button>
      </div>
      <div className="finance-grid">
        {metrics.map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{formatCHF(value)}</strong>
          </article>
        ))}
      </div>
      <p className="muted">
        La marge est estimée au coût renseigné lors des achats. Elle n’est pas un bénéfice net ; les
        ardoises non payées et les produits encore au kiosque expliquent les écarts de trésorerie.
      </p>
      {f.unknownSalesCents > 0 && <MissingCosts cents={f.unknownSalesCents} />}
      <div className="ledger-summary">
        <span>Toutes semaines confondues</span>
        <strong>{formatCHF(state.admin!.financial.dueCents)} à recevoir</strong>
        <span>{formatCHF(state.admin!.financial.creditsCents)} d’avoirs disponibles</span>
      </div>
      <h2 className="section-heading">Autres dépenses</h2>
      {state.admin!.expenses.length ? (
        <div className="table-wrap">
          <table className="responsive-records expenses-table" role="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Motif</th>
                <th>Montant</th>
                <th>Correction</th>
              </tr>
            </thead>
            <tbody>
              {state.admin!.expenses.map((e) => (
                <tr key={e.id}>
                  <td data-label="Date">{new Date(e.spent_at).toLocaleDateString('fr-CH')}</td>
                  <td className="record-title">
                    {e.reason}
                    {e.voided_at && <small>Annulée · {e.void_reason}</small>}
                  </td>
                  <td data-label="Montant" className="record-amount">
                    {formatCHF(e.cents)}
                  </td>
                  <td className="record-actions">
                    {!e.voided_at && (
                      <button
                        className="button secondary compact"
                        disabled={busy}
                        onClick={() => setVoiding(e.id)}
                        aria-label={`Annuler la dépense ${e.reason}`}
                      >
                        Annuler
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Aucune autre dépense enregistrée." />
      )}
      {expense && (
        <Dialog
          title="Enregistrer une dépense"
          onClose={() => {
            if (!working) setExpense(false);
          }}
        >
          <form onSubmit={save}>
            <Field label="Motif">
              <input name="reason" required minLength={3} maxLength={300} />
            </Field>
            <Field label="Montant (CHF)">
              <input name="amount" inputMode="decimal" required />
            </Field>
            <Field label="Date">
              <input name="date" type="date" defaultValue={dateInput()} required />
            </Field>
            <button className="button primary full" disabled={busy || working}>
              Enregistrer la dépense
            </button>
          </form>
        </Dialog>
      )}
      {voiding && (
        <Dialog
          title="Annuler une dépense"
          onClose={() => {
            if (!busy) setVoiding(null);
          }}
        >
          <p>
            L’opération d’origine reste dans l’historique. Enregistre ensuite le bon montant si
            nécessaire.
          </p>
          <form onSubmit={cancel}>
            <Field label="Motif d’annulation">
              <textarea name="reason" required minLength={3} maxLength={300} />
            </Field>
            <button className="button primary full" disabled={busy}>
              Confirmer l’annulation
            </button>
          </form>
        </Dialog>
      )}
    </>
  );
}
function MissingCosts({ cents }: { cents: number }) {
  const { state, run, busy, notice } = useApp();
  const [open, setOpen] = useState(false);
  const lines = state.admin!.unknownCosts;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = formData(e);
    try {
      await run('completeCosts', {
        reason: String(f.reason),
        lines: lines.map((l) => ({ id: l.id, costMicros: costMicrosFromInput(String(f[l.id])) })),
      });
      setOpen(false);
      notice('Coûts complétés avec une trace. Les prix et les ardoises sont inchangés.');
    } catch (e) {
      notice((e as Error).message);
    }
  }
  return (
    <div className="notice-box">
      <p>{formatCHF(cents)} de ventes ont un coût inconnu et sont exclues du calcul de marge.</p>
      <button className="button secondary" onClick={() => setOpen(true)}>
        Renseigner les coûts
      </button>
      {open && (
        <Dialog title="Compléter les coûts inconnus" onClose={() => setOpen(false)}>
          <p>
            Renseigne le coût unitaire d’achat correspondant à chaque vente. Cette action complète
            la marge ; elle ne change pas les prix facturés.
          </p>
          <form onSubmit={save}>
            {lines.map((l) => (
              <Field
                key={l.id}
                label={`${l.product_name} · ${l.quantity} unité(s) · ${new Date(l.created_at).toLocaleDateString('fr-CH')}`}
                hint="Par article, en CHF."
              >
                <input
                  name={l.id}
                  inputMode="decimal"
                  defaultValue={
                    l.current_cost === null ? '' : (l.current_cost / 1000000).toFixed(6)
                  }
                  required
                />
              </Field>
            ))}
            <Field label="Motif">
              <input
                name="reason"
                defaultValue="Coût d’achat retrouvé"
                required
                minLength={3}
                maxLength={300}
              />
            </Field>
            <button className="button primary full" disabled={busy}>
              Compléter ces coûts
            </button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
