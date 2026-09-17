import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_ACCENT } from './colors';

const ACCENT_STORAGE_KEY = 'expense-tracker:accent-color';

type ThemeContextValue = {
  accent: string;
  setAccent: (hex: string) => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  accent: DEFAULT_ACCENT,
  setAccent: () => {},
  ready: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState(DEFAULT_ACCENT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ACCENT_STORAGE_KEY)
      .then((stored) => {
        if (stored) setAccentState(stored);
      })
      .finally(() => setReady(true));
  }, []);

  const setAccent = useCallback((hex: string) => {
    setAccentState(hex);
    // Fire and forget — the in-memory state update is what drives the UI,
    // persistence just needs to catch up before next app open.
    AsyncStorage.setItem(ACCENT_STORAGE_KEY, hex).catch(() => {});
  }, []);

  return (
    <ThemeContext.Provider value={{ accent, setAccent, ready }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAccent() {
  return useContext(ThemeContext);
}
