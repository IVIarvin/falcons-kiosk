'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw, Shield } from 'lucide-react';
import { useApp } from '@/components/context';
import { PageTitle, Empty, Field, Dialog, Busy } from '@/components/ui';
import { centsFromInput, formatCHF } from '@/lib/money';
import { ApiError, durableAction, pendingAction } from '@/lib/client';
import type { PatchCampaign } from './service';
import styles from './view.module.css';

function usePatchAction(action: 'reservePatch' | 'confirmPatchOrder') {
  const { state, refresh, notice } = useApp();
  const [working, setWorking] = useState(false);
  const [pending, setPending] = useState(!!pendingAction(action, state.user.id));
  const [error, setError] = useState('');
  async function perform(data?: Record<string, unknown>) {
    if (working) return 'failed' as const;
    setWorking(true);
    setError('');
    try {
      await durableAction(action, state.user.id, data);
      await refresh();
      notice(
        action === 'reservePatch'
          ? 'Réservation enregistrée.'
          : 'Commande confirmée. Les ardoises ont été mises à jour.',
      );
      return 'ok' as const;
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && [400, 409].includes(e.status)) await refresh();
      return e instanceof ApiError && e.code === 'PRICE_CHANGED'
        ? ('changed' as const)
        : ('failed' as const);
    } finally {
      setPending(!!pendingAction(action, state.user.id));
      setWorking(false);
    }
  }
  return { perform, working, pending, error, clear: () => setError('') };
}
function status(c: PatchCampaign) {
  return c.status === 'ordered'
    ? 'Commande passée'
    : c.status === 'cancelled'
      ? 'Précommande annulée'
      : c.reservable
        ? 'Réservations ouvertes'
        : 'Réservations closes';
}
function CampaignHeading({ campaign: c }: { campaign: PatchCampaign }) {
  return (
    <header className={styles.heading}>
      <div>
        <h2>{c.name}</h2>
        <span className="status">{status(c)}</span>
      </div>
      <p className={styles.price}>
        {formatCHF(c.priceCents)}
        <span>{c.status === 'ordered' ? 'prix définitif par patch' : 'estimation par patch'}</span>
      </p>
    </header>
  );
}
function CampaignCopy({ campaign: c }: { campaign: PatchCampaign }) {
  return (
    <>
      {c.description && <p className={styles.description}>{c.description}</p>}
      <p className={styles.deadline}>
        Réservations jusqu’au{' '}
        {new Date(c.deadline + 'T12:00:00Z').toLocaleDateString('fr-CH', {
          timeZone: 'Europe/Zurich',
        })}{' '}
        inclus.
      </p>
    </>
  );
}
function CampaignProgress({ campaign: c }: { campaign: PatchCampaign }) {
  const reached = c.totalCents >= c.fundingGoalCents;
  return (
    <section className={styles.funding} aria-label={`Objectif de précommandes ${c.name}`}>
      <div className={styles.fundingCounts}>
        <strong>
          {c.totalQuantity} patch{c.totalQuantity > 1 ? 's' : ''} dans la section
        </strong>
        <span>
          {c.reservationCount} réservation{c.reservationCount > 1 ? 's' : ''}
        </span>
      </div>
      <progress
        value={Math.min(c.totalCents, c.fundingGoalCents)}
        max={c.fundingGoalCents}
        aria-label="Progression des précommandes"
        aria-valuetext={`${formatCHF(c.totalCents)} sur ${formatCHF(c.fundingGoalCents)}`}
      />
      <div className={styles.fundingAmounts}>
        <strong>
          {formatCHF(c.totalCents)} / {formatCHF(c.fundingGoalCents)}
        </strong>
        <span>{reached ? 'Objectif atteint' : 'Objectif minimum'}</span>
      </div>
      {c.status === 'open' && (
        <p className={styles.help}>
          Total estimé. Le responsable ajuste le prix selon la quantité et confirme le prix
          définitif à la commande.
        </p>
      )}
    </section>
  );
}
function Reservation({
  campaign: c,
  operation,
}: {
  campaign: PatchCampaign;
  operation: ReturnType<typeof usePatchAction>;
}) {
  const [quantity, setQuantity] = useState(String(c.myQuantity || 1));
  useEffect(() => {
    setQuantity(String(c.myQuantity || 1));
  }, [c.myQuantity]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    await operation.perform({ campaignId: c.id, quantity: Number(quantity) });
  }
  return (
    <article className={styles.campaign}>
      <CampaignHeading campaign={c} />
      <CampaignCopy campaign={c} />
      <CampaignProgress campaign={c} />
      {c.myQuantity > 0 && c.status !== 'cancelled' && (
        <p className={styles.reserved}>
          {c.myQuantity} patch{c.myQuantity > 1 ? 's' : ''} réservé{c.myQuantity > 1 ? 's' : ''}
        </p>
      )}
      {c.status === 'cancelled' && c.myQuantity > 0 && (
        <p className={styles.help}>
          Ta réservation a été annulée. Aucun montant n’a été ajouté à ton ardoise.
        </p>
      )}
      {c.status === 'ordered' && c.myQuantity > 0 && (
        <p className={styles.help}>
          {c.myChargeVoided
            ? 'Montant annulé par le responsable.'
            : `${formatCHF(c.myQuantity * c.priceCents)} ajoutés à ton ardoise.`}{' '}
          <Link href="/ardoise">Voir mon ardoise</Link>
        </p>
      )}
      {c.reservable && (
        <form onSubmit={submit} className={styles.reserveForm}>
          <Field label="Quantité à réserver">
            <input
              type="number"
              min={1}
              max={1000}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              disabled={operation.working || operation.pending}
            />
          </Field>
          <div className={styles.reservationTotal}>
            <span>Ton total estimé</span>
            <strong>
              {Number.isInteger(Number(quantity)) && Number(quantity) > 0
                ? formatCHF(Number(quantity) * c.priceCents)
                : 'À renseigner'}
            </strong>
          </div>
          <div className={styles.actions}>
            <button className="button primary" disabled={operation.working || operation.pending}>
              {operation.working ? <Busy /> : c.myQuantity > 0 ? 'Mettre à jour' : 'Réserver'}
            </button>
            {c.myQuantity > 0 && (
              <button
                type="button"
                className="button secondary"
                disabled={operation.working || operation.pending}
                onClick={() => void operation.perform({ campaignId: c.id, quantity: 0 })}
              >
                Annuler ma réservation
              </button>
            )}
          </div>
          <p className={styles.help}>
            Aucun débit maintenant. L’ardoise est mise à jour quand le responsable confirme la
            commande.
          </p>
        </form>
      )}
      {!c.reservable && c.status === 'open' && (
        <p className={styles.help}>
          En attente de la commande par le responsable. Les réservations ne sont plus modifiables.
        </p>
      )}
    </article>
  );
}
export function PatchMemberView() {
  const { state } = useApp();
  const operation = usePatchAction('reservePatch');
  const campaigns = state.patches.filter((c) => c.status !== 'cancelled' || c.myQuantity > 0);
  return (
    <>
      <PageTitle title="Patchs" subtitle="Réserve ta quantité. Le débit attend la commande." />
      {operation.pending && (
        <div className="notice-box">
          <p>Une réservation attend confirmation.</p>
          <button
            className="button secondary"
            disabled={operation.working}
            onClick={() => void operation.perform()}
          >
            <RefreshCw size={17} /> Retrouver ma réservation
          </button>
        </div>
      )}
      {operation.error && (
        <p role="alert" className={styles.error}>
          {operation.error}
        </p>
      )}
      {!campaigns.length ? (
        <Empty title="Aucune précommande pour le moment.">
          Le responsable publiera ici les prochains modèles de la section.
        </Empty>
      ) : (
        <div className={styles.list}>
          {campaigns.map((c) => (
            <Reservation key={c.id} campaign={c} operation={operation} />
          ))}
        </div>
      )}
    </>
  );
}
export function PatchAdminView() {
  const { state, run, busy } = useApp();
  const order = usePatchAction('confirmPatchOrder');
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<PatchCampaign | null>(null);
  const [cancelling, setCancelling] = useState<PatchCampaign | null>(null);
  const [editing, setEditing] = useState<PatchCampaign | null>(null);
  const [finalPrice, setFinalPrice] = useState('');
  const [error, setError] = useState('');
  let finalTotal: number | null = null;
  try {
    if (confirming && finalPrice.trim())
      finalTotal = centsFromInput(finalPrice) * confirming.totalQuantity;
  } catch {}
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(
    new Date(Date.now() + 14 * 86400000),
  );
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const data = new FormData(e.currentTarget);
    try {
      await run('createPatchCampaign', {
        name: String(data.get('name')),
        description: String(data.get('description') ?? ''),
        priceCents: centsFromInput(String(data.get('price'))),
        fundingGoalCents: centsFromInput(String(data.get('goal'))),
        deadline: String(data.get('deadline')),
      });
      setCreating(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function confirm(e: FormEvent) {
    e.preventDefault();
    if (!confirming) return;
    if (finalTotal === null) return;
    const result = await order.perform(
      order.pending
        ? undefined
        : {
            campaignId: confirming.id,
            expectedTotalQuantity: confirming.totalQuantity,
            expectedPriceCents: confirming.estimatedPriceCents,
            expectedFundingGoalCents: confirming.fundingGoalCents,
            finalPriceCents: centsFromInput(finalPrice),
          },
    );
    if (result !== 'failed') setConfirming(null);
  }
  async function estimate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setError('');
    const data = new FormData(e.currentTarget);
    try {
      await run('updatePatchEstimate', {
        campaignId: editing.id,
        priceCents: centsFromInput(String(data.get('price'))),
        fundingGoalCents: centsFromInput(String(data.get('goal'))),
      });
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function cancel() {
    if (!cancelling) return;
    try {
      await run('cancelPatchCampaign', { campaignId: cancelling.id });
      setCancelling(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <PageTitle title="Précommandes de patchs">
        <button
          className="button primary"
          onClick={() => {
            setError('');
            setCreating(true);
          }}
        >
          <Plus size={18} /> Créer une précommande
        </button>
      </PageTitle>
      {order.pending && (
        <div className="notice-box">
          <p>Une commande attend confirmation. Vérifie-la avant d’en créer une autre.</p>
          <button
            className="button secondary"
            disabled={order.working}
            onClick={() => void order.perform()}
          >
            <RefreshCw size={17} /> Retrouver la commande
          </button>
        </div>
      )}
      {order.error && !confirming && (
        <p role="alert" className={styles.error}>
          {order.error}
        </p>
      )}
      {!state.patches.length ? (
        <Empty title="Prépare les prochains patchs.">
          Publie un modèle, son prix et une date limite pour ouvrir les réservations.
        </Empty>
      ) : (
        <div className={styles.list}>
          {state.patches.map((c) => (
            <article className={styles.campaign} key={c.id}>
              <CampaignHeading campaign={c} />
              <CampaignCopy campaign={c} />
              <CampaignProgress campaign={c} />
              {c.participants.length > 0 && (
                <details className={styles.participants}>
                  <summary>Voir les réservations</summary>
                  <ul>
                    {c.participants.map((p) => (
                      <li key={p.userId}>
                        <span>
                          {p.grade} <strong>{p.name}</strong>
                        </span>
                        <span>
                          {p.quantity} patch{p.quantity > 1 ? 's' : ''}
                        </span>
                        {p.chargeVoided && <small>Montant annulé</small>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {c.status === 'open' && (
                <div className={styles.actions}>
                  <button
                    className="button primary"
                    disabled={busy || order.working || order.pending || !c.totalQuantity}
                    onClick={() => {
                      order.clear();
                      setError('');
                      setFinalPrice((c.estimatedPriceCents / 100).toString());
                      setConfirming(c);
                    }}
                  >
                    <Shield size={18} /> Confirmer la commande passée
                  </button>
                  <button
                    className="button secondary"
                    disabled={busy || order.working || order.pending}
                    onClick={() => {
                      setError('');
                      setEditing(c);
                    }}
                  >
                    Ajuster l’estimation
                  </button>
                  <button
                    className="button secondary"
                    disabled={busy || order.working || order.pending}
                    onClick={() => {
                      setError('');
                      setCancelling(c);
                    }}
                  >
                    Annuler la précommande
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {creating && (
        <Dialog
          title="Nouvelle précommande"
          onClose={() => {
            if (!busy) setCreating(false);
          }}
        >
          <form onSubmit={create}>
            <Field label="Nom du patch">
              <input name="name" required minLength={2} maxLength={120} />
            </Field>
            <Field label="Description (facultative)">
              <textarea name="description" maxLength={1000} rows={3} />
            </Field>
            <Field label="Prix estimé par patch (CHF)">
              <input name="price" inputMode="decimal" required />
            </Field>
            <Field label="Objectif minimum (CHF)">
              <input name="goal" inputMode="decimal" defaultValue="100" required />
            </Field>
            <Field
              label="Dernier jour de réservation"
              hint="Inclus, heure Suisse. L’estimation peut être ajustée selon la quantité."
            >
              <input
                name="deadline"
                type="date"
                defaultValue={date}
                required
                aria-label="Dernier jour de réservation"
              />
            </Field>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? <Busy /> : 'Ouvrir les réservations'}
            </button>
          </form>
        </Dialog>
      )}
      {editing && (
        <Dialog
          title="Ajuster l’estimation"
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form onSubmit={estimate}>
            <h3>{editing.name}</h3>
            <p className={styles.help}>
              Ajuste l’estimation selon la quantité réservée et le devis fournisseur. Aucun débit à
              cette étape.
            </p>
            <Field label="Prix estimé par patch (CHF)">
              <input
                name="price"
                inputMode="decimal"
                defaultValue={(editing.estimatedPriceCents / 100).toString()}
                required
              />
            </Field>
            <Field label="Objectif minimum (CHF)">
              <input
                name="goal"
                inputMode="decimal"
                defaultValue={(editing.fundingGoalCents / 100).toString()}
                required
              />
            </Field>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? <Busy /> : 'Enregistrer l’estimation'}
            </button>
          </form>
        </Dialog>
      )}
      {confirming && (
        <Dialog
          title="Confirmer la commande"
          onClose={() => {
            if (!order.working) setConfirming(null);
          }}
        >
          <form onSubmit={confirm}>
            <h3>{confirming.name}</h3>
            <Field label="Prix définitif par patch (CHF)">
              <input
                inputMode="decimal"
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                disabled={order.working || order.pending}
                required
              />
            </Field>
            <p className={styles.confirmTotal}>
              {confirming.totalQuantity} patchs ·{' '}
              <strong>{finalTotal === null ? 'À renseigner' : formatCHF(finalTotal)}</strong>
            </p>
            <p className={styles.help}>
              Objectif minimum : {formatCHF(confirming.fundingGoalCents)}.
              {finalTotal !== null && finalTotal < confirming.fundingGoalCents
                ? ' Le total au prix définitif est inférieur à cet objectif.'
                : ''}
            </p>
            <p className={styles.help}>
              Confirme uniquement si la commande a été passée au fournisseur. Les montants seront
              ajoutés aux ardoises, sans les marquer payés. Les réservations seront ensuite figées.
            </p>
            {order.error && (
              <p role="alert" className={styles.error}>
                {order.error}
              </p>
            )}
            <button
              className="button primary full"
              disabled={
                order.working ||
                finalTotal === null ||
                (!order.pending && finalTotal < confirming.fundingGoalCents)
              }
            >
              {order.working ? (
                <Busy />
              ) : order.pending ? (
                'Retrouver la commande'
              ) : (
                'La commande a été passée'
              )}
            </button>
          </form>
        </Dialog>
      )}
      {cancelling && (
        <Dialog
          title="Annuler la précommande"
          onClose={() => {
            if (!busy) setCancelling(null);
          }}
        >
          <h3>{cancelling.name}</h3>
          <p className={styles.help}>
            Les réservations seront annulées. Aucun montant ne sera ajouté aux ardoises.
          </p>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <button className="button secondary full" disabled={busy} onClick={() => void cancel()}>
            {busy ? <Busy /> : 'Annuler cette précommande'}
          </button>
        </Dialog>
      )}
    </>
  );
}
