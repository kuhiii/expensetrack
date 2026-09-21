import { PermissionsAndroid, NativeEventEmitter, NativeModules } from 'react-native';
import { parseTransactionSms, categorizeTransaction } from './categorize';
import { insertTransaction, getCategories, getMeta, setMeta } from './db';
import { UNCATEGORIZED_ID } from './categories';

export async function requestSmsPermissions(): Promise<boolean> {
  const granted = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
  ]);
  return (
    granted[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED &&
    granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED
  );
}

async function processIncomingSms(sender: string, body: string, timestamp: number, payeeHistory: Record<string, string>) {
  const parsed = parseTransactionSms(sender, body, timestamp);
  if (!parsed) return; // not a transaction SMS — ignore (OTP, promo, etc.)

  const categoryId = categorizeTransaction(parsed, payeeHistory);
  await insertTransaction({
    amount: parsed.amount,
    direction: parsed.direction,
    payee: parsed.payee,
    bank: parsed.bank,
    accountLast4: parsed.accountLast4,
    timestamp: parsed.timestamp,
    categoryId,
    rawSms: parsed.rawSms,
  });
}

/** Epoch ms of the newest message already ingested. */
const LAST_SMS_TS = 'lastSmsTs';
/**
 * How far back before the watermark each run re-reads.
 *
 * The watermark alone lost messages. It records the newest date seen, and
 * everything at or below it was skipped forever — so an SMS that reaches the
 * inbox *late*, carrying an older date than one already ingested (a carrier
 * retry, a delayed delivery), was never picked up. Two real debits went
 * missing this way in Aug and Sep. Re-reading a window is enough to catch
 * them because inserts are keyed on a hash of the message body, so seeing
 * one again is a no-op.
 */
const LOOKBACK_MS = 45 * 24 * 60 * 60 * 1000;
/** Bumped whenever the parser or the bank filter changes. */
const INGEST_VERSION = '3';
const INGEST_VERSION_KEY = 'ingestVersion';

/**
 * Historical backfill, reading the inbox through the same native module used
 * for live listening.
 *
 * Reads the *whole* inbox (0 = no limit) rather than the newest 2,000: that
 * cap silently cut history off at Jan 2026 and dropped 2,514 bank messages.
 * A watermark keeps that affordable — the first run ingests everything, and
 * later runs only look at recent messages instead of re-parsing ~11k on every
 * launch. It deliberately reaches back past the watermark; see LOOKBACK_MS.
 */
export async function backfillInbox(payeeHistory: Record<string, string>): Promise<number> {
  const { SmsReceiverModule } = NativeModules;
  if (!SmsReceiverModule) {
    console.warn('SmsReceiverModule not found — inbox backfill skipped.');
    return 0;
  }

  // A changed parser has to see the whole inbox again: without this, widening
  // the bank filter (HDFCBN, say) would only ever apply to messages arriving
  // from now on, and the matching history already on the phone stays missing.
  const ingestedWith = await getMeta(INGEST_VERSION_KEY);
  if (ingestedWith !== INGEST_VERSION) await setMeta(LAST_SMS_TS, '0');

  const watermark = Number(await getMeta(LAST_SMS_TS)) || 0;
  const since = watermark > 0 ? Math.max(watermark - LOOKBACK_MS, 0) : 0;
  const list: { address: string; body: string; date: number }[] = await SmsReceiverModule.readInbox(0);

  let newest = watermark;
  let processed = 0;
  for (const sms of list) {
    const ts = Number(sms.date);
    if (!Number.isFinite(ts) || ts <= since) continue;
    await processIncomingSms(sms.address, sms.body, ts, payeeHistory);
    if (ts > newest) newest = ts;
    processed++;
  }
  if (newest > watermark) await setMeta(LAST_SMS_TS, String(newest));
  await setMeta(INGEST_VERSION_KEY, INGEST_VERSION);
  return processed;
}

/**
 * Live listener — backed by a small custom native module (see
 * android/NATIVE_SMS_MODULE.md) that registers a BroadcastReceiver for
 * SMS_RECEIVED and emits a JS event per incoming message. Call this once
 * near app startup, after permissions are granted.
 */
export function subscribeToIncomingSms(getPayeeHistory: () => Record<string, string>) {
  const { SmsReceiverModule } = NativeModules;
  if (!SmsReceiverModule) {
    console.warn(
      'SmsReceiverModule not found — the native module from android/NATIVE_SMS_MODULE.md ' +
        "hasn't been wired into this build yet. Live SMS tagging won't run until it is; " +
        'backfillInbox() still works on its own.'
    );
    return () => {};
  }

  const emitter = new NativeEventEmitter(SmsReceiverModule);
  const subscription = emitter.addListener('onSmsReceived', (event: { sender: string; body: string; timestamp: number }) => {
    processIncomingSms(event.sender, event.body, event.timestamp, getPayeeHistory());
  });

  return () => subscription.remove();
}
