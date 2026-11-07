import type { ProductDetails } from '@/features/catalog/details';
export type Product = {
  id: string;
  name: string;
  unit: string;
  category: string;
  is_beverage: boolean;
  price_cents: number;
  price_mode: 'manual' | 'auto';
  cost_micros: number | null;
  image: string;
  active: boolean;
  available: boolean;
  details: ProductDetails;
};
export type PriceChange = {
  id: string;
  name: string;
  oldPriceCents: number;
  newPriceCents: number;
};
export type LedgerEntry = {
  id: string;
  kind: 'consumption' | 'payment' | 'refund';
  cents: number;
  at: string;
  label: string;
  voided: boolean;
  reason?: string;
  lines?: { name: string; quantity: number; priceCents: number }[];
};
export type AccountLedger = { balanceCents: number; entries: LedgerEntry[] };
export type CheckoutReceipt = {
  id: string;
  totalCents: number;
  balanceCents: number;
  quoteId: string | null;
  quoteText?: string | null;
  replay: boolean;
};
export type FinancialSummary = {
  salesCents: number;
  coveredSalesCents: number;
  costCents: number;
  marginCents: number;
  unknownSalesCents: number;
  purchasesCents: number;
  receivedCents: number;
  refundedCents: number;
  expensesCents: number;
  cashChangeCents: number;
  dueCents: number;
  creditsCents: number;
};
