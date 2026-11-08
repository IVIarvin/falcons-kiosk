import { z } from 'zod';
import type { Database } from '@/lib/db';
import { assert } from '@/lib/errors';
import {
  requireAdmin,
  updateProfile,
  changePassword,
  issueReset,
  type Member,
} from '@/features/auth/service';
import {
  getCatalog,
  saveProduct,
  recordPurchase,
  correctPurchase,
  previewAutomaticPrices,
  publishPrices,
} from '@/features/catalog/service';
import { checkout } from '@/features/checkout/service';
import { recordFreeEntry } from '@/features/free-entry/service';
import {
  getPatchBoard,
  createPatchCampaign,
  reservePatch,
  confirmPatchOrder,
  cancelPatchCampaign,
  updatePatchEstimate,
} from '@/features/patches/service';
import {
  getAccountLedger,
  getAccounts,
  getFinancialSummary,
  recordPayment,
  reverseConsumption,
  removeConsumptionLine,
  voidPayment,
  recordExpense,
  completeCosts,
  voidExpense,
} from '@/features/ledger/service';
import { getCommunity, weekBoundsZurich } from '@/features/achievements/service';
import { updateSettings, updateMember } from '@/features/admin/service';
import { canonicalUrl } from '@/lib/config';
import { searchProducts, lookupProduct } from '@/features/catalog/lookup';
import { getPillerLibrary, savePillerQuote } from '@/features/piller/service';

export type ProcurementRow = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  total_cents: number;
  purchased_at: string;
};
export type ExpenseRow = {
  id: string;
  cents: number;
  reason: string;
  spent_at: string;
  voided_at: string | null;
  void_reason: string | null;
};
export async function getSnapshot(db: Database, user: Member) {
  const [settings] = await db.query<{ piller_enabled: boolean; markup_basis_points: number }>(
    'SELECT * FROM settings WHERE id=1',
  );
  const products = await getCatalog(db, user.role === 'admin');
  const ledger = await getAccountLedger(db, user);
  const community = await getCommunity(db, user);
  const admin =
    user.role === 'admin'
      ? {
          accounts: await getAccounts(db, user),
          financial: await getFinancialSummary(db, user),
          weekFinancial: await getFinancialSummary(
            db,
            user,
            weekBoundsZurich(new Date()).start.toISOString(),
            weekBoundsZurich(new Date()).end.toISOString(),
          ),
          purchases: await db.query<ProcurementRow>(
            'SELECT p.id,p.product_id,p.quantity,p.total_cents,p.purchased_at,r.name AS product_name FROM purchases p JOIN products r ON r.id=p.product_id ORDER BY p.purchased_at DESC',
          ),
          expenses: await db.query<ExpenseRow>(
            'SELECT id,cents,reason,spent_at,voided_at,void_reason FROM expenses ORDER BY spent_at DESC',
          ),
          unknownCosts: (
            await db.query<{
              id: string;
              product_name: string;
              quantity: number;
              created_at: string;
              current_cost: string | null;
            }>(
              'SELECT l.id,l.product_name,(l.quantity-l.removed_quantity) AS quantity,c.created_at,p.cost_micros AS current_cost FROM consumption_lines l JOIN consumptions c ON c.id=l.consumption_id LEFT JOIN products p ON p.id=l.product_id WHERE l.cost_micros IS NULL AND l.quantity>l.removed_quantity AND c.reversed_at IS NULL ORDER BY c.created_at LIMIT 100',
            )
          ).map((l) => ({
            ...l,
            current_cost: l.current_cost === null ? null : Number(l.current_cost),
          })),
          settings: {
            markupBasisPoints: settings.markup_basis_points,
            pillerEnabled: settings.piller_enabled,
          },
          priceChanges: await previewAutomaticPrices(db, user),
          canonicalUrl: canonicalUrl(),
          pillerQuotes: await getPillerLibrary(db, user),
        }
      : null;
  return {
    user,
    products:
      user.role === 'admin'
        ? products
        : products.map((p) => ({ ...p, cost_micros: null, price_mode: 'manual' as const })),
    ledger,
    community,
    patches: await getPatchBoard(db, user),
    pillerEnabled: settings.piller_enabled,
    admin,
  };
}
export type Snapshot = Awaited<ReturnType<typeof getSnapshot>>;
export async function dispatch(
  db: Database,
  user: Member,
  action: string,
  input: unknown,
): Promise<unknown> {
  assert(user.active, 'Compte désactivé.', 'AUTH', 401);
  switch (action) {
    case 'freeCheckout':
      return recordFreeEntry(db, user, input);
    case 'createPatchCampaign':
      return createPatchCampaign(db, user, input);
    case 'updatePatchEstimate':
      return updatePatchEstimate(db, user, input);
    case 'reservePatch':
      return reservePatch(db, user, input);
    case 'confirmPatchOrder':
      return confirmPatchOrder(db, user, input);
    case 'cancelPatchCampaign':
      return cancelPatchCampaign(db, user, input);
    case 'pillerQuote':
      return savePillerQuote(db, user, input);
    case 'searchProducts':
      return searchProducts(db, user, input);
    case 'lookupProduct':
      return lookupProduct(db, user, input);
    case 'checkout':
      return checkout(db, user, input);
    case 'product':
      return saveProduct(db, user, input);
    case 'purchase':
      return recordPurchase(db, user, input);
    case 'correctPurchase':
      return correctPurchase(db, user, input);
    case 'publishPrices':
      return publishPrices(db, user, input);
    case 'settings':
      return updateSettings(db, user, input);
    case 'payment':
      return recordPayment(db, user, input);
    case 'reverseConsumption':
      return reverseConsumption(db, user, input);
    case 'removeConsumptionLine':
      return removeConsumptionLine(db, user, input);
    case 'voidPayment':
      return voidPayment(db, user, input);
    case 'expense':
      return recordExpense(db, user, input);
    case 'voidExpense':
      return voidExpense(db, user, input);
    case 'completeCosts':
      return completeCosts(db, user, input);
    case 'profile':
      return updateProfile(db, user, input);
    case 'password':
      return changePassword(db, user, input);
    case 'memberAccess':
      return updateMember(db, user, input);
    case 'resetCode':
      requireAdmin(user);
      return {
        token: await issueReset(db, user, z.object({ memberId: z.string() }).parse(input).memberId),
      };
    case 'ledger':
      return getAccountLedger(db, user, z.object({ memberId: z.string() }).parse(input).memberId);
    default:
      throw new Error('Action inconnue.');
  }
}
