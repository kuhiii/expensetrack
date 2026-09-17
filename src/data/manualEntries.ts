import { UNCATEGORIZED_ID } from './categories';

/**
 * Transactions that never arrived as SMS.
 *
 * PNB stopped sending transaction texts after 21 Jun 2026, so these were
 * given to me directly. The parser can't see them, and without them the
 * july totals are short.
 *
 * The DAY is a placeholder — only the month was known, and every total in
 * the app is month-scoped, so the figures are right even though the date on
 * the card isn't. Replace `day` here if you want the real ones.
 */
export type ManualEntry = {
  amount: number;
  direction: 'debit' | 'credit';
  payee: string;
  day: number;
  note?: string;
};

export const MANUAL_BANK = 'PNB';
export const MANUAL_MONTH = { year: 2026, month: 6 }; // july 2026

export const MANUAL_ENTRIES: ManualEntry[] = [
  { amount: 3044, direction: 'debit', payee: 'district by zomato', day: 1 },
  { amount: 444, direction: 'debit', payee: 'blinkit', day: 1 },
  { amount: 1447, direction: 'debit', payee: 'blinkit', day: 1 },
  { amount: 2066, direction: 'debit', payee: 'downtown', day: 1 },
  { amount: 981, direction: 'debit', payee: 'downtown', day: 1 },
  // Money in — these must not land in spending.
  { amount: 1500, direction: 'credit', payee: 'pnb account', day: 1 },
  { amount: 59, direction: 'credit', payee: 'pnb account', day: 1 },
];

/** Stable, so re-running the seed can never duplicate an entry. */
export function manualEntryId(e: ManualEntry, index: number): string {
  return `manual-${MANUAL_MONTH.year}-${MANUAL_MONTH.month}-${index}-${e.amount}`;
}

export const MANUAL_UNTAGGED = UNCATEGORIZED_ID;
