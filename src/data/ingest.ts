import { backfillInbox } from './smsBridge';
import {
  applyPayeeRules,
  categorizePaychecks,
  categorizeSavingsTransfers,
  clearSelfTransferRule,
  dedupeTransactions,
  excludePnbCredits,
  getPayeeRules,
  reconcileDirections,
  repairUnknownPayees,
  resetOrphanedCategories,
  seedManualEntries,
} from './db';

let inFlight: Promise<Record<string, string>> | null = null;

/**
 * Re-scans the SMS inbox and repairs the resulting rows, returning the
 * refreshed payee->category map.
 *
 * Two independent callers trigger this — App.tsx on cold start and on every
 * app resume, HomeScreen on resume so it can reload the screen once new data
 * is in — and Android can fire both at once. A single in-flight promise
 * collapses concurrent calls into one pass instead of running the whole
 * pipeline twice back to back.
 */
export function runIngest(payeeHistory: Record<string, string>): Promise<Record<string, string>> {
  if (!inFlight) {
    inFlight = (async () => {
      try {
        await backfillInbox(payeeHistory);
        await dedupeTransactions();
        // Rows stored before the parser learned the real SMS formats keep
        // the payee they were saved with, and the backfill won't revisit
        // them.
        await repairUnknownPayees();
        // Deposits were previously stored as spending; fix them in place.
        await reconcileDirections();
        // Rows tagged by a category that no longer exists (a stale
        // 'self-transfer' categoryId from a much older version of the app)
        // are put back into play so the step below gets a chance at them —
        // its filter only considers still-uncategorized rows.
        await resetOrphanedCategories();
        // Must run before applyPayeeRules: an old blanket rule for the
        // user's own name would otherwise keep re-excluding the HDFC leg of
        // a self-transfer before categorizeSavingsTransfers gets to it.
        await clearSelfTransferRule();
        // Self-transfers between HDFC and PNB: the HDFC leg counts as
        // spend and adds to the savings category, the PNB leg subtracts
        // from both (see getTotalSpend / getCategoryTotals).
        await categorizeSavingsTransfers();
        // Salary credits into paycheck, before payee rules get a chance
        // to file them anywhere else.
        await categorizePaychecks();
        // Transactions with no SMS behind them (PNB stopped texting).
        await seedManualEntries();
        // Remembered payee->category rules, applied to the backlog.
        await applyPayeeRules();
        await excludePnbCredits();
        return await getPayeeRules();
      } finally {
        inFlight = null;
      }
    })();
  }
  return inFlight;
}
