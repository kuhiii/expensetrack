import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, AppStateStatus, View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { runIngest } from '../data/ingest';
import { base } from '../theme/colors';
import { sizing } from '../theme/tokens';
import { TotalSpendCard } from '../components/TotalSpendCard';
import { UntaggedStack } from '../components/UntaggedStack';
import { CategoryList } from '../components/CategoryList';
import { CoffeeFooter } from '../components/CoffeeFooter';
import {
  getCategories,
  getUncategorized,
  getTotalSpend,
  getTotalReceived,
  getCategoryTotals,
  getBalance,
  monthRange,
  setTransactionCategory,
  setPayeeRule,
  setTransactionNote,
  addCategory,
  Category,
  CategoryTotal,
  Transaction,
} from '../data/db';
import { rememberPayeeCategory } from '../data/categorize';

export function HomeScreen({ navigation }: any) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [untagged, setUntagged] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [received, setReceived] = useState(0);
  const [balance, setBalance] = useState(0);
  const [totals, setTotals] = useState<Record<string, CategoryTotal>>({});
  const [payeeHistory, setPayeeHistory] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  // Totals are scoped to a calendar month, defaulting to the current one.
  // The card's month stepper pages through them.
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const range = useMemo(() => monthRange(month.year, month.month), [month]);

  const shiftMonth = useCallback((delta: number) => {
    setMonth((m) => {
      const d = new Date(m.year, m.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, []);

  // No paging into the future — there's nothing recorded there.
  const now = new Date();
  const canGoForward = month.year < now.getFullYear() || month.month < now.getMonth();

  const load = useCallback(async () => {
    const [cats, untaggedTx, totalSpend, totalReceived, categoryTotals, runningBalance] =
      await Promise.all([
        getCategories(),
        getUncategorized(range),
        getTotalSpend(range),
        getTotalReceived(range),
        getCategoryTotals(range),
        getBalance(range),
      ]);
    setCategories(cats);
    setUntagged(untaggedTx);
    setTotal(totalSpend);
    setReceived(totalReceived);
    setTotals(categoryTotals);
    setBalance(runningBalance);
  }, [range]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // App.tsx re-scans the SMS inbox on every foreground, not just cold start
  // (see runIngest) — this is what picks the results up. runIngest collapses
  // concurrent calls into one pass, so calling it again here rather than
  // waiting on App.tsx's own call is cheap, and it's what lets this screen
  // know when fresh rows have actually landed.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        runIngest({}).then(load);
      }
    });
    return () => sub.remove();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleTag = async (transactionId: string, categoryId: string, note?: string) => {
    const tx = untagged.find((t) => t.id === transactionId);
    await setTransactionCategory(transactionId, categoryId);
    if (note !== undefined) await setTransactionNote(transactionId, note);
    if (tx) {
      setPayeeHistory((h) => rememberPayeeCategory(h, tx.payee, categoryId));
      // Persisted, so tagging a payee once classifies it on every future
      // launch — the in-memory map alone was reset on every app start.
      await setPayeeRule(tx.payee, categoryId);
    }
    await load();
  };

  const handleCategoryCreated = async (categoryId: string, label: string, iconKey: string | null) => {
    await addCategory(categoryId, label, iconKey);
    await load();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <TotalSpendCard
        total={total}
        received={received}
        balance={balance}
        month={month}
        onShiftMonth={shiftMonth}
        canGoForward={canGoForward}
      />

      <View style={styles.section}>
        <UntaggedStack
          transactions={untagged}
          categories={categories}
          onTag={handleTag}
          onCategoryCreated={handleCategoryCreated}
        />

        <CategoryList
          categories={categories}
          totals={totals}
          onOpenCategory={(categoryId) => navigation.navigate('CategoryDetail', { categoryId })}
          onCategoryCreated={handleCategoryCreated}
        />
      </View>

      {/* Outside the padded section so it runs edge to edge, and last so the
          page simply ends on it. */}
      <CoffeeFooter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: base.backgroundPrimary },
  // The Android status bar already insets this screen (it isn't drawn
  // through), so this is the real gap above the cat and plant — adding the
  // safe-area top as well double-counted it.
  // No bottom padding: the footer is the end of the page.
  content: { paddingTop: sizing.scale900 - sizing.scale100 },
  // Matches the total-spend card's gutter, so the whole app shares one
  // 12px margin from the screen edges.
  section: { paddingHorizontal: sizing.scale500 },
});
