import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { requestSmsPermissions, subscribeToIncomingSms } from './src/data/smsBridge';
import { runIngest } from './src/data/ingest';

export default function App() {
  const payeeHistoryRef = useRef<Record<string, string>>({});

  useEffect(() => {
    let unsubscribeSms = () => {};
    let mounted = true;

    (async () => {
      const granted = await requestSmsPermissions();
      if (!granted) return; // user declined — app still works for manual entries

      payeeHistoryRef.current = await runIngest(payeeHistoryRef.current);
      if (!mounted) return;
      unsubscribeSms = subscribeToIncomingSms(() => payeeHistoryRef.current);
    })();

    // The live listener only fires while the JS context is alive, so any SMS
    // that arrives while the app is fully backgrounded — which is most of
    // them, since Android keeps the process around rather than restarting
    // it on every reopen — was invisible until the app got force-closed and
    // relaunched. Re-running the ingest on every foreground, not just on
    // cold start, is what makes reopening the app pick up new SMS on its own.
    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        runIngest(payeeHistoryRef.current).then((history) => {
          payeeHistoryRef.current = history;
        });
      }
    });

    return () => {
      mounted = false;
      unsubscribeSms();
      appStateSub.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
