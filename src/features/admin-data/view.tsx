'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { Database, Download, RefreshCw, Search } from 'lucide-react';
import { useApp } from '@/components/context';
import { Busy, Dialog, Field, PageTitle } from '@/components/ui';
import { authEvent, clearPrivateState } from '@/lib/client';
import { formatCHF } from '@/lib/money';
import type { AdminDataResult, ResetPreparation } from './service';
import styles from './view.module.css';
type Ticket = Pick<ResetPreparation, 'token' | 'counts' | 'adminsPreserved'> & {
  backupDownloaded: boolean;
};
const labels: Record<string, string> = {
  id: 'ID',
  name: 'Nom',
  grade: 'Grade',
  phone: 'Téléphone',
  role: 'Rôle',
  active: 'Actif',
  category: 'Catégorie',
  unit: 'Format',
  price_cents: 'Prix/article',
  funding_goal_cents: 'Objectif de collecte',
  final_price_cents: 'Prix définitif/article',
  cost_micros: 'Achat/article',
  total_cents: 'Montant initial',
  cents: 'Montant',
  quantity: 'Quantité',
  removed_quantity: 'Retirés',
  origin: 'Origine',
  product_name: 'Produit',
  created_at: 'Créé le',
  purchased_at: 'Date d’achat',
  received_at: 'Reçu le',
  spent_at: 'Date',
  reason: 'Motif',
  status: 'Statut',
  deadline: 'Date limite',
  ordered_at: 'Commandé le',
  text: 'Texte',
  topic: 'Thème',
  enabled: 'Actif',
  revision: 'Version',
  action: 'Action',
  user_id: 'Compte',
  actor_id: 'Admin',
  product_id: 'Produit',
  consumption_id: 'Consommation',
  campaign_id: 'Campagne',
  reference_id: 'Référence',
  updated_at: 'Modifié le',
  reversed_at: 'Annulé le',
  voided_at: 'Annulé le',
};
async function request<T>(body?: unknown, query = '') {
  const response = await fetch('/api/admin/data' + query, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const result = await response.json();
  if (response.status === 401) window.dispatchEvent(new Event(authEvent));
  if (!result.ok) throw new Error(result.message);
  return result.data as T;
}
function cell(key: string, value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (key.endsWith('_cents') || key === 'cents') return formatCHF(Number(value));
  if (key === 'cost_micros') return formatCHF(Number(value) / 10000);
  if (key.endsWith('_at'))
    return new Date(String(value)).toLocaleString('fr-CH', {
      timeZone: 'Europe/Zurich',
      dateStyle: 'short',
      timeStyle: 'short',
    });
  return String(value);
}
export function AdminDataView() {
  const { state } = useApp();
  const key = `falcons_reset_${state.user.id}`;
  const [table, setTable] = useState('users'),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(1);
  const [grid, setGrid] = useState<AdminDataResult | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null),
    [working, setWorking] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(key) ?? 'null');
      if (
        !stored ||
        !/^[a-f0-9]{64}$/.test(stored.token) ||
        typeof stored.adminsPreserved !== 'number' ||
        typeof stored.backupDownloaded !== 'boolean' ||
        !stored.counts ||
        typeof stored.counts !== 'object' ||
        Array.isArray(stored.counts) ||
        !Object.values(stored.counts).every((v) => typeof v === 'number' && v >= 0)
      )
        return null;
      return stored;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      void request<AdminDataResult>(
        undefined,
        '?' + new URLSearchParams({ table, search, page: String(page) }),
      )
        .then((data) => {
          if (!cancelled) setGrid(data);
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [table, search, page, revision]);
  function remember(next: Ticket | null) {
    setTicket(next);
    if (next) sessionStorage.setItem(key, JSON.stringify(next));
    else sessionStorage.removeItem(key);
  }
  async function prepare() {
    setWorking(true);
    setError('');
    try {
      const data = await request<ResetPreparation>({ action: 'prepare' });
      remember({
        token: data.token,
        counts: data.counts,
        adminsPreserved: data.adminsPreserved,
        backupDownloaded: false,
      });
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data.backup, null, 2)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `falcons-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  async function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticket || working) return;
    const fields = new FormData(event.currentTarget);
    setWorking(true);
    setError('');
    try {
      await request({
        action: 'reset',
        data: {
          token: ticket.token,
          password: String(fields.get('password')),
          confirmation: String(fields.get('confirmation')),
          backupDownloaded: ticket.backupDownloaded,
        },
      });
      remember(null);
      clearPrivateState();
      window.location.assign('/connexion');
    } catch (e) {
      setError((e as Error).message);
      setWorking(false);
    }
  }
  return (
    <>
      <PageTitle title="Données">
        <button
          className="button secondary"
          disabled={loading || working}
          onClick={() => setRevision((v) => v + 1)}
        >
          <RefreshCw size={17} />
          Actualiser
        </button>
      </PageTitle>
      <div className={styles.tools}>
        <a className="button secondary" href="/api/admin/documents/sauvegarde">
          <Download size={17} />
          Sauvegarde
        </a>
        <a
          className="text-button"
          href="https://console.neon.tech/"
          target="_blank"
          rel="noreferrer"
        >
          Console Neon
        </a>
      </div>
      <div className={styles.filters}>
        <Field label="Table">
          <select
            value={table}
            onChange={(e) => {
              setTable(e.target.value);
              setPage(1);
              setSearch('');
            }}
          >
            {grid ? (
              grid.tables.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.label} ({t.count})
                </option>
              ))
            ) : (
              <option value="users">Comptes</option>
            )}
          </select>
        </Field>
        <Field label="Rechercher dans les données">
          <span className="search-field">
            <Search size={17} />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </span>
        </Field>
      </div>
      {error && !ticket && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <section aria-label="Contenu de la base" aria-busy={loading}>
        {loading ? (
          <p role="status">
            <Busy />
          </p>
        ) : (
          grid && (
            <>
              <p className={styles.count}>
                {grid.total} ligne{grid.total > 1 ? 's' : ''} · lecture seule
              </p>
              <div className={`table-wrap ${styles.rows}`}>
                <table>
                  <thead>
                    <tr>
                      {grid.columns.map((c) => (
                        <th key={c}>{labels[c] ?? c}</th>
                      ))}
                      <th>Détail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grid.rows.map((row, i) => (
                      <tr key={String(row.id ?? i)}>
                        {grid.columns.map((c) => (
                          <td key={c}>
                            <span className={styles.value} title={cell(c, row[c])}>
                              {cell(c, row[c])}
                            </span>
                          </td>
                        ))}
                        <td>
                          <button className="text-button" onClick={() => setDetail(row)}>
                            Voir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {grid.rows.length === 0 && <p className={styles.empty}>Aucune ligne.</p>}
              </div>
              <div className={styles.pagination}>
                <button
                  className="button secondary"
                  disabled={grid.page <= 1}
                  onClick={() => setPage(grid.page - 1)}
                >
                  Précédent
                </button>
                <span>
                  {grid.page} / {Math.max(1, Math.ceil(grid.total / grid.pageSize))}
                </span>
                <button
                  className="button secondary"
                  disabled={grid.page * grid.pageSize >= grid.total}
                  onClick={() => setPage(grid.page + 1)}
                >
                  Suivant
                </button>
              </div>
            </>
          )
        )}
      </section>
      <section className={styles.reset}>
        <Database size={24} />
        <div>
          <h2>Repartir de zéro</h2>
          <p>Tous les admins sont conservés. Le reste est effacé.</p>
          <small>La sauvegarde contient des données privées. Conserve-la en lieu sûr.</small>
        </div>
        <button className="button secondary" disabled={working} onClick={() => void prepare()}>
          {working ? <Busy /> : 'Sauvegarder et préparer le reset'}
        </button>
      </section>
      {detail && (
        <Dialog title="Détail de la ligne" onClose={() => setDetail(null)}>
          <pre className={styles.json}>{JSON.stringify(detail, null, 2)}</pre>
        </Dialog>
      )}
      {ticket && (
        <Dialog
          title="Réinitialiser le kiosque"
          onClose={() => {
            if (!working) remember(null);
          }}
        >
          <p>
            <strong>
              {ticket.adminsPreserved} compte{ticket.adminsPreserved > 1 ? 's' : ''} admin conservé
              {ticket.adminsPreserved > 1 ? 's' : ''}.
            </strong>
          </p>
          <p>Produits, membres, opérations, patchs et réglages personnalisés seront effacés.</p>
          <dl className={styles.counts}>
            {[
              ['Produits', ticket.counts.products],
              ['Membres', (ticket.counts.users ?? 0) - ticket.adminsPreserved],
              ['Consommations', ticket.counts.consumptions],
              ['Campagnes', ticket.counts.patch_campaigns],
            ].map(([label, count]) => (
              <div key={String(label)}>
                <dt>{label}</dt>
                <dd>{count ?? 0}</dd>
              </div>
            ))}
          </dl>
          <form onSubmit={reset}>
            <label className="check-line">
              <input
                type="checkbox"
                checked={ticket.backupDownloaded}
                onChange={(e) => remember({ ...ticket, backupDownloaded: e.target.checked })}
                required
                disabled={working}
              />
              J’ai enregistré la sauvegarde.
            </label>
            <Field label="Ton mot de passe admin">
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                maxLength={128}
                required
                disabled={working}
              />
            </Field>
            <Field label="Saisis RESET FALCONS">
              <input
                name="confirmation"
                autoComplete="off"
                pattern="RESET FALCONS"
                required
                disabled={working}
              />
            </Field>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className={`button full ${styles.danger}`}
              disabled={working || !ticket.backupDownloaded}
            >
              {working ? <Busy /> : 'Confirmer la remise à zéro'}
            </button>
          </form>
        </Dialog>
      )}
    </>
  );
}
