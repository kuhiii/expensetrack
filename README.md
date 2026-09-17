# my expense

A personal expense tracker for Android that reads bank SMS and works out where
the money went, so there's nothing to enter by hand. Pink, with a pixel cat.

Built for one phone and one set of accounts (HDFC + PNB, Indian bank SMS
formats), sideloaded rather than shipped. React Native, local SQLite, no
backend and no account — the data never leaves the device.

## What it does

- **Reads the SMS inbox** and parses bank messages into transactions: amount,
  direction, payee, bank, account. Non-bank senders are ignored, so telco bills
  and promos don't get counted as spending.
- **Categorises automatically.** Tag a payee once and every past and future
  message from them lands in the same category.
- **A swipe queue for the rest** — swipe left to skip, right to tag, with a note
  if you want one.
- **Tracks income too.** Salary lands in `paycheck`; a refund sits in the
  category it came out of.
- **Self-transfers aren't spending.** Money moved to your own savings account is
  tracked as savings and nets out when it comes back, rather than being counted
  twice.
- **A running balance** — each month's leftover carries into the next.

## Layout

```
src/data/         the whole pipeline: SMS parsing (categorize.ts),
                  ingest (ingest.ts, smsBridge.ts), SQLite (db.ts)
src/components/   the home card, swipe stack, category list, sheets
src/screens/      HomeScreen, CategoryDetailScreen
src/theme/        design tokens — Base-derived scale, Anton + Urbanist
android/…/sms/    Kotlin: BroadcastReceiver for live SMS + inbox reader
android/…/appicon/ Kotlin: switches the launcher icon between two cats
```

The SMS parsing in `src/data/categorize.ts` was written against a real inbox of
~11,000 messages rather than generic templates, which is most of why it
matches anything at all. Regional bank SMS is not a standard.

## Running it

Needs Android SDK, JDK 17, and a device connected over USB with USB debugging on.

```bash
npm install
npx react-native start          # Metro
npx react-native run-android    # build + install the debug app
```

A standalone build that doesn't need Metro:

```bash
cd android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

`MainActivity` has no launcher entry of its own — the two icon aliases carry it
— so if `run-android` can't start the app, launch it explicitly:

```bash
adb shell am start -n com.expensetracker/.MainActivityManeki
```

## Permissions

`READ_SMS` and `RECEIVE_SMS`, and that's the point of the app. Nothing is
uploaded anywhere; there's no network code beyond React Native's own dev tooling.
