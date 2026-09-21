import { UNCATEGORIZED_ID } from './categories';

export type ParsedSms = {
  amount: number;
  /** The account balance the bank quoted in this message, when it quoted one. */
  balanceAfter: number | null;
  direction: 'debit' | 'credit';
  payee: string;
  bank: string;
  accountLast4: string | null;
  timestamp: number;
  rawSms: string;
};

// --- 1. Parsing --------------------------------------------------------
// Indian bank/UPI SMS are fairly templated. This covers the common shapes;
// real inbox samples will very likely need a few more patterns added here
// once you can see actual formats from your bank(s) — that's expected,
// this isn't meant to be exhaustive on the first pass.

const AMOUNT_RE = /(?:rs\.?|inr)\s?([\d,]*\d[\d,]*(?:\.\d{1,2})?)/i;
// "deposited" is the important one here: HDFC announces incoming money as
// "Update! INR 1,19,483.00 deposited in HDFC Bank A/c XX1234", which matched
// neither list — and the old fallback treated anything undetermined as a
// debit, so deposits were counted as spending (₹1.25L of a single month).
const DEBIT_RE = /\b(debited|debit|spent|sent|paid|withdrawn)\b/i;
const CREDIT_RE =
  /\b(credited|credit|received|deposited|deposit|refund(?:ed)?|reversed|cashback)\b/i;
const ACCOUNT_RE = /a\/?c\s?(?:no\.?|ending)?\s?[x*]*(\d{3,4})/i;
/**
 * The running balance the bank quotes in a lot of its messages — "Avl bal INR
 * 1,20,240.48", "AvlBal INR 11500.60", "Avl bal: 18859.58". It's the only
 * authoritative figure in the whole pipeline: everything else the app knows is
 * inferred by adding up messages, which silently goes wrong the moment one is
 * missing.
 */
const BALANCE_RE =
  /(?:avl(?:\.|ailable)?\s*bal(?:ance)?|avlbal|bal)\s*(?:is|:)?\s*(?:inr|rs\.?)?\s*([\d,]+\.?\d*)/i;

export function extractBalance(body: string): number | null {
  const m = body.match(BALANCE_RE);
  if (!m) return null;
  const value = parseFloat(m[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}
// Payee extraction, written against the real inbox rather than generic
// templates. The dominant HDFC shape is
//   "Sent Rs.431.00 From HDFC Bank A/C *1234 To JOHN DOE On 02/08/25 Ref ..."
// so the payee is whatever sits between "To" and "On <date>". The older
// VPA-only pattern assumed "To name@bank", which matched just 9.8% of
// messages; the three alternatives below cover 80.3%.
const PAYEE_RE = new RegExp(
  // 1. "To <payee> On <date>" — the common bank-transfer/UPI wording
  "(?:\\bto\\s+([A-Za-z0-9][A-Za-z0-9 .&'\\-_@]{1,40}?)\\s+on\\s+\\d)" +
    // 2. an explicit UPI VPA, e.g. "VPA someone@okhdfcbk"
    '|(?:\\b(?:to|from|vpa)\\s+([a-zA-Z0-9.\\-_]+@[a-zA-Z]+))' +
    // 3. card/merchant wording, e.g. "at SWIGGY on 02-08-25"
    "|(?:\\bat\\s+([A-Za-z0-9][A-Za-z0-9 .&'\\-_]{2,30}?)\\s+on\\s+\\d)",
  'i'
);
const BANK_SENDER_RE = /^[A-Z]{2}-([A-Z]+)/; // e.g. "VM-HDFCBK" -> HDFCBK

/**
 * Only messages from a bank shortcode are treated as transactions.
 *
 * Measured against the real inbox: 5,739 messages contain a rupee amount,
 * but only 3,105 come from a bank — the other 2,634 are telco bills and
 * promos (Airtel, marketing shortcodes) that were being stored as spending
 * and inflating the total. They're also the bulk of the 'Unknown' payees,
 * since a promo has no payee to find.
 */
const BANK_CODES =
  /(HDFCBK|HDFCBN|ICICIB|SBIINB|SBICRD|AXISBK|KOTAKB|PNBSMS|BOIIND|CANBNK|IDFCFB|YESBNK|INDBNK|UNIONB|CENTBK|RBLBNK|AUBANK|BOBTXN|FEDBNK)/i;

export function isBankSender(sender: string): boolean {
  return BANK_CODES.test(sender);
}

/**
 * Messages a bank sends that aren't money moving. A bank shortcode is not
 * enough on its own: the same number that texts you a debit also sends
 * marketing, payment requests and reminders, all of which carry a rupee
 * amount and a debit/credit word, and were being stored as real
 * transactions. Measured against the inbox this rejects 27 messages out of
 * 2,896 and leaves every genuine one:
 *
 *   "…has requested Rs. 2086.00 from you"      a collect request, not a payment
 *   "Upcoming mandate set for 11/8/24 …
 *    your account will be debited with Rs 59"  a heads-up; the real debit texts later
 *   "10% cashback up to Rs.50 … T&C"           an advert
 *
 * A reversal ("your UPI transaction of Rs.20 has been reversed") is real
 * money coming back and deliberately isn't matched here.
 */
const NOT_A_TRANSACTION_RE =
  /\bhas requested\b|\bupcoming mandate\b|\bwill be debited with\b|\b(?:up\s?to|upto)\s+(?:rs|inr)\b|\bT&C\b|\bapply now\b|\blimit per txn\b|\bkindly maintain\b/i;

export function isNonTransactionMessage(body: string): boolean {
  return NOT_A_TRANSACTION_RE.test(body);
}

/**
 * Credit is tested first, and an undetermined direction returns null rather
 * than being assumed to be spending. Defaulting to debit is what let money
 * coming in be counted as money going out.
 */
export function detectDirection(body: string): 'debit' | 'credit' | null {
  if (CREDIT_RE.test(body)) return 'credit';
  if (DEBIT_RE.test(body)) return 'debit';
  return null;
}

/**
 * Sentinel rule target meaning "this isn't spending". Transactions matching
 * it get direction 'transfer', which every spend query filters out — so they
 * leave the total, the category breakdown and the tagging queue at once.
 */
export const SELF_TRANSFER = 'self-transfer';

/**
 * Rules stated directly rather than inferred. Person-to-person transfers
 * carry nothing in the message that says what they were for, so the only
 * way to classify them is to be told once — these are seeded on first run,
 * and everything tagged in the app afterwards joins them.
 * Keys must be lowercase.
 */
export const SEED_PAYEE_RULES: Record<string, string> = {
  'jatin mann': 'rent',
  'atrey raj singh': 'gifts-donations',
  // "kunjal singh" — the user's own name — used to sit here as
  // SELF_TRANSFER, dropping every self-transfer out of the app entirely.
  // It's handled separately now (see db.ts#categorizeSavingsTransfers):
  // money sent from HDFC to the PNB account is savings, not a transaction
  // to hide, and a payee-keyed rule can't tell that leg apart from money
  // moving the other way — only which account it's leaving from can.
};

/** Placeholder when no payee pattern fits the message. */
export const UNKNOWN_PAYEE = 'Unknown';

/**
 * Incoming money is described differently: HDFC writes
 *   "... deposited in HDFC Bank A/c XX1234 on 03-JUL-26 for NEFT Cr-IDFB123-ACME PVT LTD PAYROLL"
 * so the counterparty trails a "for", behind a scheme prefix and a reference
 * number. Those get stripped, then the first hyphen-delimited chunk that
 * actually reads as a name is taken.
 */
function payeeFromDeposit(body: string): string | null {
  const m = body.match(/\bfor\s+(.+)$/i);
  if (!m) return null;
  const tail = m[1]
    .trim()
    .replace(/^(?:NEFT|IMPS|RTGS)\s*Cr[-\s]*[A-Z0-9]+[-\s]*/i, '')
    .replace(/^UPI[-\s]*/i, '')
    .replace(/^FT[-\s]*[\dX]+[-\s]*[\dX]+\s*[-\s]*/i, '');
  const named = tail
    .split(/[-–]/)
    .map((part) => part.trim())
    .find((part) => /[A-Za-z]{3}/.test(part) && !/@/.test(part));
  if (!named) return null;
  return named.replace(/\s+/g, ' ').slice(0, 40);
}

/** The payee name/VPA, or UNKNOWN_PAYEE when no pattern fits. */
export function extractPayee(body: string): string {
  const m = body.match(PAYEE_RE);
  if (m) {
    const value = m[1] ?? m[2] ?? m[3];
    // Bank SMS often double-space around the name.
    if (value) return value.trim().replace(/\s+/g, ' ');
  }
  return payeeFromDeposit(body) ?? UNKNOWN_PAYEE;
}

export function parseTransactionSms(sender: string, body: string, timestamp: number): ParsedSms | null {
  // A rupee amount alone is not a transaction — telco bills and marketing
  // messages are full of them. Require a bank sender first.
  if (!isBankSender(sender)) return null;
  // ...and a bank sender alone isn't enough — see isNonTransactionMessage.
  if (isNonTransactionMessage(body)) return null;

  const amountMatch = body.match(AMOUNT_RE);
  if (!amountMatch) return null; // not a transaction SMS (OTP/promo/etc.)

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  // AMOUNT_RE's [\d,]+ also matches digit-less strings (e.g. "Rs ,"), so
  // parseFloat can yield NaN. A non-finite number thrown at the bridge
  // fails RN's argument validation mid-enqueue and corrupts the call queue
  // ("Malformed calls from JS: field sizes are different"), so reject it
  // here rather than letting it reach SQLite.
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (!Number.isFinite(timestamp)) return null;

  const direction = detectDirection(body);
  if (!direction) return null;
  const accountMatch = body.match(ACCOUNT_RE);
  const bankMatch = sender.match(BANK_SENDER_RE);

  return {
    amount,
    balanceAfter: extractBalance(body),
    direction,
    payee: extractPayee(body),
    bank: bankMatch ? bankMatch[1] : sender,
    accountLast4: accountMatch ? accountMatch[1] : null,
    timestamp,
    rawSms: body,
  };
}

// --- 2. Categorization ---------------------------------------------------

// Rule 1: stable merchant name keywords -> category id. Extend this as you
// notice new recurring merchants — it only helps when the payee string is
// actually consistent (app-routed payments), which excludes direct-UPI
// rides like Rapido by definition.
const MERCHANT_KEYWORDS: Record<string, string> = {
  swiggy: 'food-dining',
  zomato: 'food-dining',
  uber: 'transport',
  ola: 'transport',
  blinkit: 'groceries',
  zepto: 'groceries',
  bigbasket: 'groceries',
  amazon: 'shopping',
  flipkart: 'shopping',
  myntra: 'shopping',
  netflix: 'entertainment',
  spotify: 'entertainment',
  hotstar: 'entertainment',
};

// Rule 2: Rapido-style config — direct UPI, no stable payee string, but a
// recognizable weekday time-and-amount pattern. Tune AMOUNT band once you
// have a few weeks of real fares; these are reasonable starting defaults.
export const RAPIDO_RULE = {
  categoryId: 'transport',
  weekdayWindows: [
    { startHour: 10, endHour: 12 },
    { startHour: 19, endHour: 21 },
  ],
  amountMin: 25,
  amountMax: 250,
};

function isWeekday(date: Date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function matchesRapidoWindow(date: Date): boolean {
  if (!isWeekday(date)) return false;
  const hour = date.getHours();
  return RAPIDO_RULE.weekdayWindows.some((w) => hour >= w.startHour && hour < w.endHour);
}

/**
 * Returns a suggested categoryId, or UNCATEGORIZED_ID if nothing matches
 * confidently. `payeeHistory` is a payee -> categoryId map built from past
 * manual taps (see setTransactionCategory call sites) — repeat payees
 * short-circuit straight to whatever they were tagged as last time,
 * without re-running the other rules.
 */
export function categorizeTransaction(
  parsed: ParsedSms,
  payeeHistory: Record<string, string>
): string {
  if (parsed.direction !== 'debit') return UNCATEGORIZED_ID;

  // Repeat payee — seen and tagged before (covers weekend Rapido rides
  // that repeat, or any other direct-UPI merchant you've tagged once).
  const remembered = payeeHistory[parsed.payee.toLowerCase()];
  if (remembered) return remembered;

  // Stable merchant keyword match.
  const payeeLower = parsed.payee.toLowerCase();
  for (const [keyword, categoryId] of Object.entries(MERCHANT_KEYWORDS)) {
    if (payeeLower.includes(keyword)) return categoryId;
  }

  // Rapido weekday time-window + amount-band rule.
  const date = new Date(parsed.timestamp);
  const inAmountBand = parsed.amount >= RAPIDO_RULE.amountMin && parsed.amount <= RAPIDO_RULE.amountMax;
  if (matchesRapidoWindow(date) && inAmountBand) {
    return RAPIDO_RULE.categoryId;
  }

  // Weekends, and anything else with no signal, fall through to the
  // Uncategorized bucket for manual tagging — matches what you asked for.
  return UNCATEGORIZED_ID;
}

/**
 * Call this whenever a transaction gets manually tagged (or an auto-tag
 * gets corrected) so the payee->category memory improves over time.
 * Store the result of this alongside your categories table, keyed by
 * lowercased payee string.
 */
export function rememberPayeeCategory(
  payeeHistory: Record<string, string>,
  payee: string,
  categoryId: string
): Record<string, string> {
  return { ...payeeHistory, [payee.toLowerCase()]: categoryId };
}
