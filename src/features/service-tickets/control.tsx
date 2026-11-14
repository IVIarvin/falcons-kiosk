'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { useApp } from '@/components/context';
import { Busy, Dialog, Field, PageTitle } from '@/components/ui';
import { api } from '@/lib/client';
import { serviceDay } from './period';
import type { ServiceBoard, ServicePeople, ServiceHistoryTicket } from './service';
import styles from './view.module.css';

export function ServiceControlView() {
  const { state } = useApp();
  const [from, setFrom] = useState(serviceDay);
  const [to, setTo] = useState(serviceDay);
  const [board, setBoard] = useState<ServiceBoard | null>(null);
  const [people, setPeople] = useState<ServicePeople | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cancelling, setCancelling] = useState<ServiceHistoryTicket | null>(null);
  const [merging, setMerging] = useState<{ id: string; name: string } | null>(null);
  const [selectedMember, setSelectedMember] = useState('');
  const request = useRef(0);
  const gate = useRef(false);
  const load = useCallback(async (start: string, end: string) => {
    const version = ++request.current;
    setLoading(true);
    setError('');
    setBoard(null);
    try {
      const [b, p] = await Promise.all([
        api<ServiceBoard>('serviceBoard', { from: start, to: end }),
        api<ServicePeople>('servicePeople'),
      ]);
      if (request.current === version) {
        setBoard(b);
        setPeople(p);
      }
    } catch (e) {
      if (request.current === version) setError((e as Error).message);
    } finally {
      if (request.current === version) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load(serviceDay(), serviceDay());
    return () => {
      request.current++;
    };
  }, [load]);
  if (state.user.role !== 'admin') return null;
  async function cancel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cancelling || gate.current) return;
    const reason = String(new FormData(e.currentTarget).get('reason') ?? '');
    gate.current = true;
    setWorking(true);
    setError('');
    try {
      await api('voidServiceTicket', { id: cancelling.id, reason });
      setCancelling(null);
      setMessage('Ticket annulé. Le contrôle a été recalculé.');
      await load(from, to);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      gate.current = false;
      setWorking(false);
    }
  }
  async function merge(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!merging || !selectedMember || gate.current) return;
    gate.current = true;
    setWorking(true);
    setError('');
    try {
      await api('mergeServiceVisitor', { visitorId: merging.id, memberId: selectedMember });
      setMerging(null);
      setMessage(
        'Visiteur rattaché. Tous ses tickets sont conservés sur ce compte, sans ajout à l’ardoise.',
      );
      await load(from, to);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      gate.current = false;
      setWorking(false);
    }
  }
  const timestamp = (date: string) =>
    new Intl.DateTimeFormat('fr-CH', {
      timeZone: 'Europe/Zurich',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(date));
  return (
    <>
      <PageTitle
        title="Contrôle du service"
        subtitle="Comparer les quantités servies et les consommations déclarées."
      >
        <Link className="button secondary" href="/">
          Retour au kiosque
        </Link>
      </PageTitle>
      <p className={styles.reportInfo}>
        Les tickets ne facturent rien. Une quantité à vérifier peut correspondre à une déclaration
        faite plus tard. Davantage de déclarations reste compatible avec le libre-service.
      </p>
      <form
        className={styles.toolbar}
        onSubmit={(e) => {
          e.preventDefault();
          setMessage('');
          void load(from, to);
        }}
      >
        <Field label="Du">
          <input type="date" required value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Au">
          <input type="date" required value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <button className="button secondary" disabled={loading || working}>
          <RefreshCw size={17} /> Actualiser
        </button>
      </form>
      <p className={styles.hint}>Dates incluses, heure suisse · 93 jours maximum</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {loading && <Busy />}
      {board && (
        <>
          <section className={styles.results} aria-label="Rapprochement des quantités">
            <h2>Quantités à recouper</h2>
            <p className={styles.hint}>
              Du {board.from} au {board.to} · seuls les produits notés par un admin apparaissent.
            </p>
            {!board.rows.length ? (
              <p>Aucun ticket de service actif sur cette période.</p>
            ) : (
              <div className={styles.scroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Personne / produit</th>
                      <th className={styles.number}>Servi</th>
                      <th className={styles.number}>Déclaré</th>
                      <th>Contrôle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.rows.map((r) => (
                      <tr key={`${r.memberId ?? r.visitorId}:${r.productId}`}>
                        <td>
                          <strong>{r.personName}</strong>
                          <small>
                            {r.grade} · {r.productName} {r.unit}
                          </small>
                        </td>
                        <td className={styles.number}>{r.served}</td>
                        <td className={styles.number}>{r.declared}</td>
                        <td className={r.missing ? styles.missing : styles.status}>
                          {r.visitorId
                            ? `${r.missing} à vérifier · Visiteur`
                            : r.missing
                              ? `${r.missing} à vérifier`
                              : r.declared === r.served
                                ? 'Quantités cohérentes'
                                : 'Libre-service possible'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className={styles.visitors} aria-label="Visiteurs à rattacher">
            <h2>Visiteurs</h2>
            <p className={styles.reportInfo}>
              Après l’inscription, rattache la fiche au bon compte. Les tickets et leur nom
              d’origine restent conservés. Aucune fusion n’est faite automatiquement.
            </p>
            {!people?.visitors.length ? (
              <p>Aucun visiteur en attente de rattachement.</p>
            ) : (
              people.visitors.map((v) => (
                <div key={v.id} className={styles.visitor}>
                  <span>
                    <strong>{v.name}</strong>
                    <small>Visiteur · créé le {timestamp(v.createdAt)}</small>
                  </span>
                  <button
                    className="button secondary"
                    aria-label={`Rattacher ${v.name}`}
                    disabled={working}
                    onClick={() => {
                      setError('');
                      setSelectedMember('');
                      setMerging(v);
                    }}
                  >
                    Rattacher
                  </button>
                </div>
              ))
            )}
          </section>
          <section className={styles.history} aria-label="Historique du service">
            <h2>Derniers tickets</h2>
            <p className={styles.hint}>
              Les 100 derniers tickets de la période, annulations comprises.
            </p>
            {!board.tickets.length ? (
              <p>Aucun ticket sur cette période.</p>
            ) : (
              board.tickets.map((t) => (
                <div key={t.id} className={`${styles.ticket} ${t.voidedAt ? styles.voided : ''}`}>
                  <div>
                    <strong>
                      {t.personName} · {t.productName} +1
                    </strong>
                    <small>
                      {timestamp(t.createdAt)} · noté par {t.actorName}
                    </small>
                    {t.recipientName !== t.personName && (
                      <small>Nom au service : {t.recipientName}</small>
                    )}
                    {t.voidedAt && (
                      <p>
                        Annulé par {t.voidedByName} · {t.voidReason}
                      </p>
                    )}
                  </div>
                  {!t.voidedAt && (
                    <button
                      className="button secondary"
                      disabled={working}
                      aria-label={`Annuler le ticket ${t.id}`}
                      onClick={() => {
                        setError('');
                        setCancelling(t);
                      }}
                    >
                      Annuler
                    </button>
                  )}
                </div>
              ))
            )}
          </section>
        </>
      )}
      {cancelling && (
        <Dialog
          title="Annuler un ticket"
          onClose={() => {
            if (!working) setCancelling(null);
          }}
        >
          <p>
            {cancelling.personName} · {cancelling.productName} +1
          </p>
          <form onSubmit={(e) => void cancel(e)}>
            <Field label="Motif">
              <input name="reason" required minLength={3} maxLength={300} />
            </Field>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" disabled={working}>
              {working ? <Busy /> : 'Confirmer l’annulation'}
            </button>
          </form>
        </Dialog>
      )}
      {merging && (
        <Dialog
          title="Rattacher un visiteur"
          onClose={() => {
            if (!working) setMerging(null);
          }}
        >
          <p>
            <strong>{merging.name}</strong> sera rattaché au compte choisi. Vérifie l’identité de la
            personne avant de confirmer.
          </p>
          <form onSubmit={(e) => void merge(e)}>
            <Field label="Compte inscrit">
              <select
                aria-label="Compte inscrit"
                required
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
              >
                <option value="">Choisir le compte…</option>
                {people?.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.grade} {m.name}
                  </option>
                ))}
              </select>
            </Field>
            {selectedMember && (
              <p className={styles.confirmation}>
                {merging.name} → {people?.members.find((m) => m.id === selectedMember)?.name}. Tous
                ses tickets seront regroupés pour le contrôle.
              </p>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" disabled={working || !selectedMember}>
              {working ? <Busy /> : 'Confirmer le rattachement'}
            </button>
          </form>
        </Dialog>
      )}
    </>
  );
}
