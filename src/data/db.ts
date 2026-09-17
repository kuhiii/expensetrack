import SQLite from 'react-native-sqlite-storage';
import {
  CATEGORY_PRESETS,
  colorForCategoryIndex,
  PAYCHECK_ID,
  UNCATEGORIZED_ID,
} from './categories';
import { MANUAL_BANK, MANUAL_ENTRIES, MANUAL_MONTH, manualEntryId } from './manualEntries';
import {
  detectDirection,
  extractPayee,
  isBankSender,
  SEED_PAYEE_RULES,
  SELF_TRANSFER,
  UNKNOWN_PAYEE,
} from './categorize';

SQLite.enablePromise(true);

export type Transaction = {
  id: string;
  amount: number;
  direction: 'debit' | 'credit';
  payee: string; // raw name/VPA extracted from the SMS — random for direct-UPI merchants
  bank: string; // e.g. "HDFC"
  accountLast4: string | null;
  timestamp: number; // epoch ms
  categoryId: string; // UNCATEGORIZED_ID until tagged
  rawSms: string;
  note: string | null;
};

export type Category = {
  id: string;
  label: string;
  colorHex: string;
  createdAt: number;
  /** Key into CATEGORY_ICONS; null falls back to the preset's icon. */
  iconKey?: string | null;
  /** Hidden categories stay out of the list and the tag picker. */
  hidden?: boolean;
};

/** A category's money for a window, kept apart rather than netted. */
export type CategoryTotal = { spent: number; received: number };

// Memoizes the in-flight *promise*, not the resolved handle: callers hit
// this concurrently (HomeScreen loads four queries in a Promise.all), and
// caching the handle would hand it out as soon as the database opened —
// before the CREATE TABLEs below had run, so the first launch after a
// fresh install failed with "no such table: transactions".
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initDb().catch((err) => {
      dbPromise = null; // let a later call retry rather than caching the failure
      throw err;
    });
  }
  return dbPromise;
}

async function initDb(): Promise<SQLite.SQLiteDatabase> {
  const dbInstance = await SQLite.openDatabase({ name: 'expense-tracker.db', location: 'default' });
  await dbInstance.executeSql(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      colorHex TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
  `);
  await dbInstance.executeSql(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      direction TEXT NOT NULL,
      payee TEXT NOT NULL,
      bank TEXT NOT NULL,
      accountLast4 TEXT,
      timestamp INTEGER NOT NULL,
      categoryId TEXT NOT NULL DEFAULT '${UNCATEGORIZED_ID}',
      rawSms TEXT NOT NULL,
      note TEXT
    );
  `);
  await addColumnIfMissing(dbInstance, 'transactions', 'note', 'note TEXT');
  await dbInstance.executeSql(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  await dbInstance.executeSql(`
    CREATE TABLE IF NOT EXISTS payee_rules (
      payee TEXT PRIMARY KEY,
      categoryId TEXT NOT NULL
    );
  `);
  await addColumnIfMissing(dbInstance, 'categories', 'iconKey', 'iconKey TEXT');
  await addColumnIfMissing(dbInstance, 'categories', 'hidden', 'hidden INTEGER NOT NULL DEFAULT 0');
  await seedCoreCategories(dbInstance);
  await seedPaycheckCategory(dbInstance);
  await seedPayeeRules(dbInstance);
  return dbInstance;
}

/** ALTER TABLE is not idempotent, so check the schema before adding. */
async function addColumnIfMissing(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  ddl: string
) {
  const [info] = await db.executeSql(`PRAGMA table_info(${table})`);
  for (let i = 0; i < info.rows.length; i++) {
    if (info.rows.item(i).name === column) return;
  }
  await db.executeSql(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

/**
 * Paycheck is added once, not on every launch: seeding it unconditionally
 * would bring it straight back after the user deleted it.
 */
async function seedPaycheckCategory(db: SQLite.SQLiteDatabase) {
  const [flag] = await db.executeSql('SELECT value FROM meta WHERE key = ?', ['seededPaycheck']);
  if (flag.rows.length > 0) return;
  await ensureCategory(db, PAYCHECK_ID);
  await db.executeSql('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', ['seededPaycheck', '1']);
}

async function seedCoreCategories(db: SQLite.SQLiteDatabase) {
  const [result] = await db.executeSql('SELECT COUNT(*) as count FROM categories');
  const count = result.rows.item(0).count;
  if (count > 0) return; // already seeded on a previous launch

  const core = CATEGORY_PRESETS.filter((c) => c.core);
  for (let i = 0; i < core.length; i++) {
    const preset = core[i];
    await db.executeSql(
      'INSERT INTO categories (id, label, colorHex, createdAt, iconKey) VALUES (?, ?, ?, ?, ?)',
      [preset.id, preset.label, colorForCategoryIndex(i), Date.now(), preset.iconKey]
    );
  }
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const [result] = await db.executeSql('SELECT value FROM meta WHERE key = ?', [key]);
  return result.rows.length > 0 ? (result.rows.item(0).value as string) : null;
}

export async function setMeta(key: string, value: string) {
  const db = await getDb();
  await db.executeSql('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [key, value]);
}

async function seedPayeeRules(db: SQLite.SQLiteDatabase) {
  for (const [payee, categoryId] of Object.entries(SEED_PAYEE_RULES)) {
    await db.executeSql('INSERT OR IGNORE INTO payee_rules (payee, categoryId) VALUES (?, ?)', [
      payee.toLowerCase(),
      categoryId,
    ]);
  }
}

/**
 * Creates a category row if it isn't there yet. A rule can name a category
 * the user hasn't added (rent, say), and the breakdown reads its label and
 * colour from this table.
 */
async function ensureCategory(db: SQLite.SQLiteDatabase, categoryId: string) {
  const [existing] = await db.executeSql('SELECT 1 FROM categories WHERE id = ?', [categoryId]);
  if (existing.rows.length > 0) return;
  const preset = CATEGORY_PRESETS.find((c) => c.id === categoryId);
  const [countRow] = await db.executeSql('SELECT COUNT(*) as count FROM categories');
  await db.executeSql(
    'INSERT INTO categories (id, label, colorHex, createdAt, iconKey) VALUES (?, ?, ?, ?, ?)',
    [
      categoryId,
      preset?.label ?? categoryId,
      colorForCategoryIndex(countRow.rows.item(0).count),
      Date.now(),
      preset?.iconKey ?? null,
    ]
  );
}

/** Remembers "this payee always means this category", across launches. */
export async function setPayeeRule(payee: string, categoryId: string) {
  const db = await getDb();
  await db.executeSql('INSERT OR REPLACE INTO payee_rules (payee, categoryId) VALUES (?, ?)', [
    payee.trim().toLowerCase(),
    categoryId,
  ]);
}

export async function getPayeeRules(): Promise<Record<string, string>> {
  const db = await getDb();
  const [result] = await db.executeSql('SELECT payee, categoryId FROM payee_rules');
  const rules: Record<string, string> = {};
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    rules[row.payee] = row.categoryId;
  }
  return rules;
}

/**
 * Applies every rule to transactions still sitting in the untagged bucket,
 * so a payee tagged once catches up its whole history. Returns how many
 * transactions moved.
 */
export async function applyPayeeRules(): Promise<number> {
  const db = await getDb();
  const rules = await getPayeeRules();
  let moved = 0;
  for (const [payee, categoryId] of Object.entries(rules)) {
    const [match] = await db.executeSql(
      categoryId === SELF_TRANSFER
        ? `SELECT COUNT(*) as count FROM transactions WHERE LOWER(payee) = ? AND direction IN ('debit', 'credit')`
        : 'SELECT COUNT(*) as count FROM transactions WHERE LOWER(payee) = ? AND categoryId = ?',
      categoryId === SELF_TRANSFER ? [payee] : [payee, UNCATEGORIZED_ID]
    );
    const count = match.rows.item(0).count as number;
    if (count === 0) continue;
    if (categoryId === SELF_TRANSFER) {
      // Not spending: re-flagging the direction takes it out of every total,
      // since all the spend queries filter on direction = 'debit'.
      await db.executeSql(
        `UPDATE transactions SET direction = 'transfer'
         WHERE LOWER(payee) = ? AND direction IN ('debit', 'credit')`,
        [payee]
      );
    } else {
      await ensureCategory(db, categoryId);
      await db.executeSql(
        'UPDATE transactions SET categoryId = ? WHERE LOWER(payee) = ? AND categoryId = ?',
        [categoryId, payee, UNCATEGORIZED_ID]
      );
    }
    moved += count;
  }
  return moved;
}

/**
 * Inserts the hand-entered transactions. Ids are deterministic, so this is
 * safe to call on every launch — nothing is duplicated.
 */
export async function seedManualEntries(): Promise<number> {
  let added = 0;
  for (let i = 0; i < MANUAL_ENTRIES.length; i++) {
    const e = MANUAL_ENTRIES[i];
    const id = manualEntryId(e, i);
    const db = await getDb();
    const [existing] = await db.executeSql('SELECT 1 FROM transactions WHERE id = ?', [id]);
    if (existing.rows.length > 0) continue;
    await insertTransaction({
      id,
      amount: e.amount,
      direction: e.direction,
      payee: e.payee,
      bank: MANUAL_BANK,
      accountLast4: null,
      timestamp: new Date(MANUAL_MONTH.year, MANUAL_MONTH.month, e.day, 12, 0).getTime(),
      categoryId: UNCATEGORIZED_ID,
      rawSms: '',
      note: e.note ?? null,
    });
    added++;
  }
  return added;
}

export async function addCategory(
  id: string,
  label: string,
  iconKey: string | null = null
): Promise<Category> {
  const db = await getDb();
  // Re-adding a category that already exists (hidden, say) brings it back
  // instead of failing on the primary key.
  const [existing] = await db.executeSql('SELECT id FROM categories WHERE id = ?', [id]);
  if (existing.rows.length > 0) {
    await db.executeSql('UPDATE categories SET hidden = 0 WHERE id = ?', [id]);
    const category = await getCategory(id);
    if (category) return category;
  }
  const [result] = await db.executeSql('SELECT COUNT(*) as count FROM categories');
  const index = result.rows.item(0).count;
  const colorHex = colorForCategoryIndex(index);
  const createdAt = Date.now();
  await db.executeSql(
    'INSERT INTO categories (id, label, colorHex, createdAt, iconKey, hidden) VALUES (?, ?, ?, ?, ?, 0)',
    [id, label, colorHex, createdAt, iconKey]
  );
  return { id, label, colorHex, createdAt, iconKey, hidden: false };
}

function toCategory(row: any): Category {
  return { ...row, hidden: Boolean(row.hidden) };
}

export async function getCategories(): Promise<Category[]> {
  const db = await getDb();
  const [result] = await db.executeSql('SELECT * FROM categories ORDER BY createdAt ASC');
  const rows: Category[] = [];
  for (let i = 0; i < result.rows.length; i++) rows.push(toCategory(result.rows.item(i)));
  return rows;
}

export async function getCategory(id: string): Promise<Category | null> {
  const db = await getDb();
  const [result] = await db.executeSql('SELECT * FROM categories WHERE id = ?', [id]);
  return result.rows.length > 0 ? toCategory(result.rows.item(0)) : null;
}

export async function renameCategory(id: string, label: string) {
  const trimmed = label.trim();
  if (!trimmed) return;
  const db = await getDb();
  await db.executeSql('UPDATE categories SET label = ? WHERE id = ?', [trimmed, id]);
}

export async function setCategoryIcon(id: string, iconKey: string) {
  const db = await getDb();
  await db.executeSql('UPDATE categories SET iconKey = ? WHERE id = ?', [iconKey, id]);
}

export async function setCategoryHidden(id: string, hidden: boolean) {
  const db = await getDb();
  await db.executeSql('UPDATE categories SET hidden = ? WHERE id = ?', [hidden ? 1 : 0, id]);
}

/** Categories the pipeline re-creates on its own; deleting them can't stick. */
export const UNDELETABLE_CATEGORY_IDS = ['investments-savings'];

/**
 * Removes a category. Its transactions go back to untagged rather than being
 * deleted, and any payee rule pointing at it is dropped — otherwise the next
 * ingest would file those payees straight back into a category that no
 * longer exists.
 */
export async function deleteCategory(id: string) {
  if (UNDELETABLE_CATEGORY_IDS.includes(id)) return;
  const db = await getDb();
  await db.executeSql('UPDATE transactions SET categoryId = ? WHERE categoryId = ?', [
    UNCATEGORIZED_ID,
    id,
  ]);
  await db.executeSql('DELETE FROM payee_rules WHERE categoryId = ?', [id]);
  await db.executeSql('DELETE FROM categories WHERE id = ?', [id]);
}

/**
 * Salary credits go to paycheck. Keyed on the NEFT narration ("PAYROLL")
 * rather than the payee, which the bank truncates differently from month to
 * month. Credits never showed per category before, so any payroll credit
 * already filed elsewhere (a stale rule had put them under subscriptions) is
 * moved once too; after that only untagged ones are touched, so a manual
 * re-tag sticks.
 */
export async function categorizePaychecks(): Promise<number> {
  const db = await getDb();
  const [exists] = await db.executeSql('SELECT 1 FROM categories WHERE id = ?', [PAYCHECK_ID]);
  if (exists.rows.length === 0) return 0; // deleted by the user — respect that

  const migrated = await getMeta('paycheckMigrated');
  const scope = migrated ? 'AND categoryId = ?' : '';
  const params = migrated ? [PAYCHECK_ID, UNCATEGORIZED_ID] : [PAYCHECK_ID];
  const [result] = await db.executeSql(
    `UPDATE transactions SET categoryId = ?
     WHERE direction = 'credit' AND UPPER(rawSms) LIKE '%PAYROLL%' ${scope}`,
    params
  );
  if (!migrated) await setMeta('paycheckMigrated', '1');
  return result.rowsAffected ?? 0;
}

/**
 * Stable id for a parsed SMS. This has to be derived purely from the message
 * body — never the timestamp the caller was handed. The live listener stamps
 * a message with the carrier's own PDU time, while the startup backfill
 * (which re-reads the whole inbox every launch) stamps the same message with
 * whatever `date` Android's SMS provider recorded for it; those two clocks
 * don't agree, sometimes by several seconds. Salting the id with either one
 * meant the same SMS could mint two different ids depending on which path
 * saw it first, and `INSERT OR IGNORE` had no way to tell they were the same
 * transaction — it silently doubled itself instead of deduping. The body
 * text alone is unique per real transaction anyway: bank SMS carries its own
 * reference number.
 */
function transactionId(rawSms: string): string {
  let hash = 5381;
  for (let i = 0; i < rawSms.length; i++) {
    hash = ((hash << 5) + hash + rawSms.charCodeAt(i)) | 0; // djb2
  }
  return (hash >>> 0).toString(36);
}

export async function insertTransaction(
  tx: Omit<Transaction, 'id' | 'note'> & { id?: string; note?: string | null }
) {
  const db = await getDb();
  const id = tx.id ?? transactionId(tx.rawSms);
  await db.executeSql(
    `INSERT OR IGNORE INTO transactions
     (id, amount, direction, payee, bank, accountLast4, timestamp, categoryId, rawSms, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tx.amount,
      tx.direction,
      tx.payee,
      tx.bank,
      tx.accountLast4,
      tx.timestamp,
      tx.categoryId,
      tx.rawSms,
      tx.note ?? null,
    ]
  );
  return id;
}

/**
 * Re-reads the payee for rows stored before the parser learned the real SMS
 * formats. Rows are keyed by a hash of the message, so the backfill will
 * never re-insert them — they'd keep showing 'Unknown' forever otherwise.
 * Only the payee column is touched, so manual tags survive.
 */
export async function repairUnknownPayees(): Promise<number> {
  const db = await getDb();
  const [result] = await db.executeSql(
    `SELECT id, rawSms FROM transactions WHERE payee = ?`,
    [UNKNOWN_PAYEE]
  );
  let fixed = 0;
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const payee = extractPayee(row.rawSms ?? '');
    if (payee !== UNKNOWN_PAYEE) {
      await db.executeSql('UPDATE transactions SET payee = ? WHERE id = ?', [payee, row.id]);
      fixed++;
    }
  }
  return fixed;
}

/**
 * Merges rows that trace back to the same SMS. Ids used to be salted with
 * the timestamp the caller happened to pass in, and the live listener and
 * the startup backfill disagree on that — the live path stamps a message
 * with the carrier's own delivery time, the backfill stamps it with
 * whatever `date` Android's SMS provider recorded — so one real message
 * could mint two different ids and survive `INSERT OR IGNORE` as two rows.
 * The id no longer includes the timestamp, so this only ever has work to do
 * once, cleaning up rows written before that fix; after that every group is
 * already a single row and this is a cheap no-op. Returns how many
 * duplicates were removed.
 */
export async function dedupeTransactions(): Promise<number> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT id, rawSms, categoryId, note FROM transactions ORDER BY rowid ASC'
  );
  const groups = new Map<string, { id: string; categoryId: string; note: string | null }[]>();
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const list = groups.get(row.rawSms) ?? [];
    list.push({ id: row.id, categoryId: row.categoryId, note: row.note });
    groups.set(row.rawSms, list);
  }

  let removed = 0;
  for (const rows of groups.values()) {
    if (rows.length < 2) continue;
    // Keep whichever copy is furthest along — tagged over untagged, noted
    // over bare — rather than always the first inserted, so a duplicate that
    // slipped in *after* the good copy was already tagged doesn't win.
    const keeper =
      rows.find((r) => r.categoryId !== UNCATEGORIZED_ID && r.note) ??
      rows.find((r) => r.categoryId !== UNCATEGORIZED_ID) ??
      rows.find((r) => r.note) ??
      rows[0];
    for (const row of rows) {
      if (row.id === keeper.id) continue;
      await db.executeSql('DELETE FROM transactions WHERE id = ?', [row.id]);
      removed++;
    }
  }
  return removed;
}

/**
 * Deletes rows that were stored before the parser required a bank sender —
 * telco bills and promos that merely contained a rupee amount. Returns how
 * many were removed.
 */
export async function purgeNonBankTransactions(): Promise<number> {
  const db = await getDb();
  const [result] = await db.executeSql('SELECT id, bank FROM transactions');
  const doomed: string[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    if (!isBankSender(String(row.bank ?? ''))) doomed.push(row.id);
  }
  for (const id of doomed) {
    await db.executeSql('DELETE FROM transactions WHERE id = ?', [id]);
  }
  return doomed.length;
}

/**
 * Re-derives direction for rows stored while an undetermined direction
 * defaulted to 'debit' — which counted deposits as spending. Rows that now
 * read differently are corrected to whatever detectDirection actually says,
 * not assumed to always be credits: this used to hardcode 'credit'
 * regardless of the recomputed value, which happened to be right for the
 * one bug it was written for but silently mangled anything else that ever
 * needed correcting the other way (debit misread as something else). Rows
 * with no determinable direction are dropped. Categories are untouched, so
 * manual tags survive.
 */
export async function reconcileDirections(): Promise<{ corrected: number; removed: number }> {
  const db = await getDb();
  const [result] = await db.executeSql('SELECT id, direction, rawSms FROM transactions');
  const toFix: { id: string; direction: 'debit' | 'credit' }[] = [];
  const toDelete: string[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const actual = detectDirection(String(row.rawSms ?? ''));
    if (actual === null) toDelete.push(row.id);
    else if (actual !== row.direction) toFix.push({ id: row.id, direction: actual });
  }
  for (const { id, direction } of toFix) {
    await db.executeSql('UPDATE transactions SET direction = ? WHERE id = ?', [direction, id]);
  }
  for (const id of toDelete) {
    await db.executeSql('DELETE FROM transactions WHERE id = ?', [id]);
  }
  return { corrected: toFix.length, removed: toDelete.length };
}

/**
 * Resets any transaction pointing at a categoryId that no longer has a real
 * row in the categories table — orphaned data from an old version of the
 * app (a literal 'self-transfer' categoryId predates the current
 * SELF_TRANSFER handling, which only ever uses that string as a payee-rule
 * sentinel, never writes it onto a transaction). An orphaned category is
 * invisible in the category list, and it made every row it touched
 * ineligible for categorizeSavingsTransfers, whose filter only considers
 * rows still sitting at UNCATEGORIZED_ID — so anything this catches was
 * both invisible in the breakdown and silently un-fixable by newer
 * categorization logic until it's put back in play here.
 */
export async function resetOrphanedCategories(): Promise<number> {
  const db = await getDb();
  const [result] = await db.executeSql(
    `SELECT COUNT(*) as count FROM transactions
     WHERE categoryId != ? AND categoryId NOT IN (SELECT id FROM categories)`,
    [UNCATEGORIZED_ID]
  );
  const count = result.rows.item(0).count as number;
  if (count > 0) {
    await db.executeSql(
      `UPDATE transactions SET categoryId = ?
       WHERE categoryId != ? AND categoryId NOT IN (SELECT id FROM categories)`,
      [UNCATEGORIZED_ID, UNCATEGORIZED_ID]
    );
  }
  return count;
}

/**
 * Money landing in the PNB account isn't income to track, so it drops out of
 * the received figure. The hand-entered ₹1,500 and ₹59 are exempt: they have
 * no rawSms, which is what distinguishes them from SMS-derived rows.
 */
export async function excludePnbCredits(): Promise<number> {
  const db = await getDb();
  const [before] = await db.executeSql(
    `SELECT COUNT(*) as count FROM transactions
     WHERE direction = 'credit' AND rawSms <> '' AND bank LIKE 'PNB%'`
  );
  const count = before.rows.item(0).count as number;
  if (count > 0) {
    await db.executeSql(
      `UPDATE transactions SET direction = 'transfer'
       WHERE direction = 'credit' AND rawSms <> '' AND bank LIKE 'PNB%'`
    );
  }
  return count;
}

/**
 * One-time cleanup: "kunjal singh" — the user's own name — used to be a
 * blanket SELF_TRANSFER payee rule, which hid every self-transfer outright.
 * That's now handled by categorizeSavingsTransfers() instead, which can
 * actually tell the two legs apart by which account the money left. The old
 * rule would otherwise keep re-excluding the HDFC leg before that function
 * ever saw it — a payee rule always wins the row before a same-run function
 * further down the pipeline gets to it, since applyPayeeRules only sweeps
 * whatever categoryId a row already carries. Safe to call every launch: a
 * no-op once the row is gone.
 */
export async function clearSelfTransferRule(): Promise<void> {
  const db = await getDb();
  await db.executeSql('DELETE FROM payee_rules WHERE payee = ? AND categoryId = ?', [
    'kunjal singh',
    SELF_TRANSFER,
  ]);
}

const SAVINGS_CATEGORY_ID = 'investments-savings';

/**
 * Both legs of a self-transfer between HDFC and PNB — money moving to your
 * own name, identified by payee rather than by bank alone. That distinction
 * matters: a PNB debit to swiggy or zomato is real spending and has to stay
 * out of this entirely, or it would get swallowed into "savings" instead of
 * landing in its real category — and worse, count as spend once when it
 * first moved HDFC->PNB and *again* when it left PNB for the purchase.
 * Restricting both legs to payee "kunjal singh" is what keeps that from
 * happening: only money genuinely moving between your own accounts is ever
 * excluded from spend, so nothing gets counted twice and nothing real gets
 * miscategorized.
 *
 * Neither leg counts toward total spend or adds to this category the normal
 * way (see getTotalSpend / getCategoryTotals) — the HDFC leg is a deposit,
 * the PNB leg a withdrawal, and they're netted against each other instead
 * of both being treated as money leaving you (see getSavingsNet).
 *
 * Both sides are restricted to rows still sitting at UNCATEGORIZED_ID, so a
 * transaction the user has already tagged by hand is never overwritten.
 */
export async function categorizeSavingsTransfers(): Promise<number> {
  const db = await getDb();
  await ensureCategory(db, SAVINGS_CATEGORY_ID);

  const [result] = await db.executeSql(
    `SELECT COUNT(*) as count FROM transactions
     WHERE direction IN ('debit', 'transfer') AND LOWER(payee) = 'kunjal singh'
       AND (bank LIKE 'HDFC%' OR bank LIKE 'PNB%') AND categoryId = ?`,
    [UNCATEGORIZED_ID]
  );
  const count = result.rows.item(0).count as number;
  if (count > 0) {
    // Direction is restored to 'debit': the old SELF_TRANSFER rule could
    // have already flipped some of these rows to 'transfer' before it was
    // cleared, and this category needs the ordinary debit sign back so it
    // still reads as an ordinary "-₹x" line in the transaction list.
    await db.executeSql(
      `UPDATE transactions SET direction = 'debit', categoryId = ?
       WHERE direction IN ('debit', 'transfer') AND LOWER(payee) = 'kunjal singh'
         AND (bank LIKE 'HDFC%' OR bank LIKE 'PNB%') AND categoryId = ?`,
      [SAVINGS_CATEGORY_ID, UNCATEGORIZED_ID]
    );
  }
  return count;
}

/**
 * Net balance of the savings category — deposits (the HDFC leg) minus
 * withdrawals (the PNB leg) — rather than the plain sum every other
 * category gets. Summing both legs the normal way would add a withdrawal
 * to a deposit instead of netting it against one.
 */
async function getSavingsNet(db: SQLite.SQLiteDatabase, range?: MonthRange): Promise<number> {
  const [result] = range
    ? await db.executeSql(
        `SELECT COALESCE(SUM(CASE WHEN bank LIKE 'HDFC%' THEN amount WHEN bank LIKE 'PNB%' THEN -amount ELSE 0 END), 0) as net
         FROM transactions WHERE categoryId = ? AND timestamp >= ? AND timestamp < ?`,
        [SAVINGS_CATEGORY_ID, range.start, range.end]
      )
    : await db.executeSql(
        `SELECT COALESCE(SUM(CASE WHEN bank LIKE 'HDFC%' THEN amount WHEN bank LIKE 'PNB%' THEN -amount ELSE 0 END), 0) as net
         FROM transactions WHERE categoryId = ?`,
        [SAVINGS_CATEGORY_ID]
      );
  return result.rows.item(0).net as number;
}

/** Diagnostic: what actually makes up the received figure for a window. */
export async function listCredits(range?: MonthRange): Promise<
  { amount: number; payee: string; bank: string; timestamp: number; manual: boolean }[]
> {
  const db = await getDb();
  const [result] = range
    ? await db.executeSql(
        `SELECT amount, payee, bank, timestamp, rawSms FROM transactions
         WHERE direction = 'credit' AND timestamp >= ? AND timestamp < ?
         ORDER BY amount DESC`,
        [range.start, range.end]
      )
    : await db.executeSql(
        `SELECT amount, payee, bank, timestamp, rawSms FROM transactions
         WHERE direction = 'credit' ORDER BY amount DESC`
      );
  const out = [];
  for (let i = 0; i < result.rows.length; i++) {
    const r = result.rows.item(i);
    out.push({
      amount: r.amount,
      payee: r.payee,
      bank: r.bank,
      timestamp: r.timestamp,
      manual: !r.rawSms,
    });
  }
  return out;
}

export async function setTransactionNote(id: string, note: string) {
  const db = await getDb();
  const trimmed = note.trim();
  await db.executeSql('UPDATE transactions SET note = ? WHERE id = ?', [trimmed || null, id]);
}

export async function setTransactionCategory(id: string, categoryId: string) {
  const db = await getDb();
  await db.executeSql('UPDATE transactions SET categoryId = ? WHERE id = ?', [categoryId, id]);
}

export async function deleteTransaction(id: string) {
  const db = await getDb();
  await db.executeSql('DELETE FROM transactions WHERE id = ?', [id]);
}

/**
 * Tagging only covers july 2026 onwards. Reading the full inbox pulled in
 * years of history, and there's no point working through a backlog that old
 * — those transactions still count toward totals, they just aren't queued.
 */
export const UNTAGGED_SINCE = new Date(2026, 6, 1).getTime();

export async function getUncategorized(range?: MonthRange): Promise<Transaction[]> {
  const db = await getDb();
  const start = Math.max(range?.start ?? UNTAGGED_SINCE, UNTAGGED_SINCE);
  const end = range?.end ?? Number.MAX_SAFE_INTEGER;
  const [result] = await db.executeSql(
    `SELECT * FROM transactions
     WHERE categoryId = ? AND direction IN ('debit', 'credit')
       AND timestamp >= ? AND timestamp < ?
     ORDER BY timestamp DESC`,
    [UNCATEGORIZED_ID, start, end]
  );
  const rows: Transaction[] = [];
  for (let i = 0; i < result.rows.length; i++) rows.push(result.rows.item(i));
  return rows;
}

export async function getTransactionsForCategory(categoryId: string): Promise<Transaction[]> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT * FROM transactions WHERE categoryId = ? ORDER BY timestamp DESC',
    [categoryId]
  );
  const rows: Transaction[] = [];
  for (let i = 0; i < result.rows.length; i++) rows.push(result.rows.item(i));
  return rows;
}

/** Half-open [start, end) epoch-ms window for a calendar month. */
export type MonthRange = { start: number; end: number };

export function monthRange(year: number, monthIndex: number): MonthRange {
  return {
    start: new Date(year, monthIndex, 1).getTime(),
    end: new Date(year, monthIndex + 1, 1).getTime(),
  };
}

export async function getTotalSpend(range?: MonthRange): Promise<number> {
  const db = await getDb();
  // The savings category is excluded from the normal per-row sum and its net
  // added back on top instead of the raw total: a plain sum would add the
  // PNB withdrawal to the HDFC deposit rather than subtracting one from the
  // other. Net is exactly what belongs in "total spend" here — money into
  // savings counts as spend, money withdrawn back out of it un-counts by the
  // same amount, and everything else (a genuine HDFC or PNB purchase to a
  // third party) was never tagged into this category in the first place, so
  // it's already included in the base sum below.
  const [result] = range
    ? await db.executeSql(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
         WHERE direction = 'debit' AND categoryId != ? AND timestamp >= ? AND timestamp < ?`,
        [SAVINGS_CATEGORY_ID, range.start, range.end]
      )
    : await db.executeSql(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
         WHERE direction = 'debit' AND categoryId != ?`,
        [SAVINGS_CATEGORY_ID]
      );
  const savingsNet = await getSavingsNet(db, range);
  return (result.rows.item(0).total as number) + savingsNet;
}

/** Money in for the window — credits, which never count toward spending. */
export async function getTotalReceived(range?: MonthRange): Promise<number> {
  const db = await getDb();
  const [result] = range
    ? await db.executeSql(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
         WHERE direction = 'credit' AND timestamp >= ? AND timestamp < ?`,
        [range.start, range.end]
      )
    : await db.executeSql(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE direction = 'credit'`
      );
  return result.rows.item(0).total as number;
}

export async function getCategoryTotals(range?: MonthRange): Promise<Record<string, CategoryTotal>> {
  const db = await getDb();
  // Spent and received are kept apart per category so the bar can show both
  // — a groceries refund sits beside groceries spend instead of silently
  // shrinking it. Savings is computed separately and netted (getSavingsNet).
  const window = range ? 'AND timestamp >= ? AND timestamp < ?' : '';
  const [result] = await db.executeSql(
    `SELECT categoryId, direction, SUM(amount) as total FROM transactions
     WHERE direction IN ('debit', 'credit') AND categoryId != ? ${window}
     GROUP BY categoryId, direction`,
    range ? [SAVINGS_CATEGORY_ID, range.start, range.end] : [SAVINGS_CATEGORY_ID]
  );
  const totals: Record<string, CategoryTotal> = {};
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const entry = (totals[row.categoryId] ??= { spent: 0, received: 0 });
    if (row.direction === 'debit') entry.spent = row.total;
    else entry.received = row.total;
  }
  const savingsNet = await getSavingsNet(db, range);
  if (savingsNet !== 0) totals[SAVINGS_CATEGORY_ID] = { spent: savingsNet, received: 0 };
  return totals;
}

/**
 * Balance at the end of a month, carrying every earlier month's leftover
 * forward. The running total starts at BALANCE_SINCE — history before it is
 * incomplete, so summing all of it would carry forward a number that was
 * never real. A month before that start just shows its own leftover.
 */
export const BALANCE_SINCE = UNTAGGED_SINCE;

export async function getBalance(range: MonthRange): Promise<number> {
  const window = { start: Math.min(range.start, BALANCE_SINCE), end: range.end };
  const [received, spent] = await Promise.all([getTotalReceived(window), getTotalSpend(window)]);
  return received - spent;
}
