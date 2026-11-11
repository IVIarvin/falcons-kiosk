'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Plus, RefreshCw, Search, Undo2, UserPlus } from 'lucide-react';
import { useApp } from '@/components/context';
import { Busy, Dialog, Field } from '@/components/ui';
import { api, durableAction, pendingAction } from '@/lib/client';
import type { Product } from '@/lib/types';
import type { ServicePeople, ServiceReceipt } from './service';
import styles from './view.module.css';

export function ServiceRecovery({
  onRecovered,
}: {
  onRecovered?: (action: string, result: unknown) => void;
}) {
  const { state, notice } = useApp();
  const [working, setWorking] = useState(false);
  const [, update] = useState(0);
  const gate = useRef(false);
  const actions = [
    { action: 'recordServiceTicket', label: 'Retrouver le ticket' },
    { action: 'createServiceVisitor', label: 'Retrouver le visiteur' },
  ].filter((a) => pendingAction(a.action, state.user.id));
  if (state.user.role !== 'admin' || !actions.length) return null;
  async function recover(action: string) {
    if (gate.current) return;
    gate.current = true;
    setWorking(true);
    try {
      const result = await durableAction<ServiceReceipt & { name: string }>(action, state.user.id);
      notice(
        action === 'recordServiceTicket'
          ? `${result.recipientName} · ${result.productName} : ticket retrouvé.`
          : `Visiteur ${result.name} retrouvé. Sélectionne son nom pour servir.`,
      );
      onRecovered?.(action, result);
    } catch (e) {
      notice((e as Error).message);
    } finally {
      gate.current = false;
      setWorking(false);
      update((v) => v + 1);
    }
  }
  return (
    <div className="notice-box">
      <p>Un enregistrement de service attend confirmation. Retrouve-le avant de continuer.</p>
      {actions.map((a) => (
        <button
          key={a.action}
          className="button secondary"
          disabled={working}
          onClick={() => void recover(a.action)}
        >
          <RefreshCw size={16} /> {a.label}
        </button>
      ))}
    </div>
  );
}

export function ServiceTicketDialog({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const { state } = useApp();
  const [people, setPeople] = useState<ServicePeople | null>(null);
  const [search, setSearch] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [last, setLast] = useState<ServiceReceipt | null>(null);
  const gate = useRef(false);
  useEffect(() => {
    let live = true;
    api<ServicePeople>('servicePeople')
      .then((p) => {
        if (live) setPeople(p);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  if (state.user.role !== 'admin') return null;
  const pending =
    !!pendingAction('recordServiceTicket', state.user.id) ||
    !!pendingAction('createServiceVisitor', state.user.id);
  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('fr');
  const all = people
    ? [
        ...people.members.map((m) => ({
          key: `member:${m.id}`,
          memberId: m.id,
          visitorId: undefined,
          name: m.name,
          subtitle: m.grade,
        })),
        ...people.visitors.map((v) => ({
          key: `visitor:${v.id}`,
          memberId: undefined,
          visitorId: v.id,
          name: v.name,
          subtitle: 'Visiteur',
        })),
      ]
    : [];
  const recentRank = (key: string) => {
    const i = people?.recent.indexOf(key) ?? -1;
    return i === -1 ? 999 : i;
  };
  const visible = all
    .filter((p) => normalize(`${p.name} ${p.subtitle}`).includes(normalize(search)))
    .sort((a, b) => recentRank(a.key) - recentRank(b.key) || a.name.localeCompare(b.name, 'fr'));
  async function serve(person: (typeof all)[number]) {
    if (gate.current || pending) return;
    gate.current = true;
    setWorking(true);
    setError('');
    try {
      const target = person.memberId
        ? { memberId: person.memberId }
        : { visitorId: person.visitorId };
      const result = await durableAction<ServiceReceipt>('recordServiceTicket', state.user.id, {
        ...target,
        productId: product.id,
      });
      setLast(result);
      setMessage(`${result.recipientName} · ${result.productName} +1 enregistré.`);
      setPeople(
        (p) =>
          p && {
            ...p,
            recent: [person.key, ...p.recent.filter((k) => k !== person.key)].slice(0, 6),
          },
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      gate.current = false;
      setWorking(false);
    }
  }
  async function createVisitor(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (gate.current || pending) return;
    gate.current = true;
    setWorking(true);
    setError('');
    try {
      const visitor = await durableAction<{ id: string; name: string }>(
        'createServiceVisitor',
        state.user.id,
        { name: visitorName.trim() },
      );
      setPeople(
        (p) =>
          p && {
            ...p,
            visitors: [{ ...visitor, createdAt: new Date().toISOString() }, ...p.visitors],
          },
      );
      setSearch(visitor.name);
      setVisitorName('');
      setMessage(`Visiteur ${visitor.name} créé. Sélectionne son nom pour servir.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      gate.current = false;
      setWorking(false);
    }
  }
  async function undo() {
    if (!last || gate.current || pending) return;
    gate.current = true;
    setWorking(true);
    setError('');
    try {
      await api('voidServiceTicket', {
        id: last.id,
        reason: 'Erreur de saisie — annulation rapide',
      });
      setMessage(`Ticket de ${last.recipientName} annulé.`);
      setLast(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      gate.current = false;
      setWorking(false);
    }
  }
  return (
    <Dialog title={`Servir · ${product.name}`} onClose={onClose}>
      <p className={styles.intro}>
        Un appui sur un nom note une unité servie. Ces tickets ne modifient pas les ardoises.
      </p>
      <div className={styles.feedback} role="status" aria-live="polite">
        {message && (
          <>
            <Check size={18} />
            <span>{message}</span>
          </>
        )}
        {last && (
          <button className="text-button" disabled={working || pending} onClick={() => void undo()}>
            <Undo2 size={16} /> Annuler
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <ServiceRecovery
        onRecovered={(action, result) => {
          setError('');
          if (action === 'recordServiceTicket') {
            const r = result as ServiceReceipt;
            setLast(r);
            setMessage(`${r.recipientName} · ${r.productName} +1 enregistré.`);
          }
          void api<ServicePeople>('servicePeople')
            .then(setPeople)
            .catch((e) => setError(e.message));
        }}
      />
      <div className="search-field">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          aria-label="Rechercher une personne"
          placeholder="Nom ou grade…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {!people ? (
        <div className={styles.loading}>
          {error ? (
            <button
              className="button secondary"
              onClick={() => {
                setError('');
                void api<ServicePeople>('servicePeople')
                  .then(setPeople)
                  .catch((e) => setError(e.message));
              }}
            >
              Réessayer
            </button>
          ) : (
            <Busy />
          )}
        </div>
      ) : (
        <>
          <p className={styles.hint}>
            {search
              ? `${visible.length} personne(s)`
              : 'Personnes récentes en premier · une unité par appui'}
          </p>
          <div className={styles.people} aria-label="Personnes à servir">
            {visible.map((p) => (
              <button
                key={p.key}
                className={styles.person}
                disabled={working || pending}
                aria-label={`Servir à ${p.name}`}
                onClick={() => void serve(p)}
              >
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {p.subtitle}
                    {recentRank(p.key) < 999 ? ' · Récent' : ''}
                  </small>
                </span>
                <Plus size={20} aria-hidden="true" />
              </button>
            ))}
          </div>
          {!visible.length && <p>Aucune personne trouvée. Tu peux créer un visiteur ci-dessous.</p>}
          <details className={styles.createVisitor}>
            <summary>
              <UserPlus size={18} /> Créer un visiteur
            </summary>
            <p>Seulement son nom. Tu pourras le rattacher à son compte après son inscription.</p>
            <form onSubmit={(e) => void createVisitor(e)}>
              <Field label="Nom du visiteur">
                <input
                  required
                  maxLength={90}
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                />
              </Field>
              <button
                className="button secondary"
                disabled={working || pending || !visitorName.trim()}
              >
                {working ? <Busy /> : 'Créer le visiteur'}
              </button>
            </form>
          </details>
        </>
      )}
    </Dialog>
  );
}
