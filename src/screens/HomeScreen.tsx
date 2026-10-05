import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDecay, withSpring, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runIngest } from '../data/ingest';
import {
  getCategories,
  getUncategorized,
  getTotalSpend,
  getTotalReceived,
  getCategoryTotals,
  getBalance,
  getSavingsMonths,
  getSavingsFund,
  monthRange,
  setTransactionCategory,
  setPayeeRule,
  setTransactionNote,
  addCategory,
  Category,
  CategoryTotal,
  SavingsMonth,
  Transaction,
} from '../data/db';
import { rememberPayeeCategory } from '../data/categorize';
import { ColorPickerModal } from '../components/ColorPickerModal';
import { Hud } from '../world/Hud';
import { SortStack } from '../world/SortStack';
import { MainRoom } from '../world/MainRoom';
import { CategoriesRoom } from '../world/CategoriesRoom';
import { SavingsRoom, SAVINGS_WIDTH } from '../world/SavingsRoom';
import { Kuhi, KuhiPreload } from '../world/Kuhi';
import { DoorSign } from '../world/DoorSign';
import { Room, Step, STEP_MS, enterPath, exitPath, restStep, setViewportHeight, setRightStripLeft } from '../world/walk';
import { GULLAK_LAYOUT } from '../world/gullakLayout';
// With the categories wall scrolled to its right end, its right strip starts here on screen.
setRightStripLeft(360 - GULLAK_LAYOUT.categories.rightW);
import { PixelPanel, W, pixelText, rupees } from '../world/pixel';

const ROOMS: Room[] = ['main', 'categories', 'savings'];
const SAVINGS_ID = 'investments-savings';
const SCREEN_W = 360;
/** How far past the end of a room you have to drag to walk through its door. */
const DOOR_PULL = 36;

/**
 * Home: the inside of the gullak. Three rooms — the main room (spend, the
 * spends to sort, munimji), and down the stairs the categories room and,
 * through its door, the savings room with the tulsi. You move between them
 * by scrolling or tapping the doors; she walks you there.
 *
 * All the data loading, tagging and category logic is unchanged from the old
 * home screen — only how it's shown has moved into the world.
 */
export function HomeScreen({ navigation }: any) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [untagged, setUntagged] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [received, setReceived] = useState(0);
  const [balance, setBalance] = useState(0);
  const [totals, setTotals] = useState<Record<string, CategoryTotal>>({});
  const [savingsMonths, setSavingsMonths] = useState<SavingsMonth[]>([]);
  const [fund, setFund] = useState<number | null>(null);
  const [payeeHistory, setPayeeHistory] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [room, setRoom] = useState<Room>('main');
  const [queueCount, setQueueCount] = useState(0);
  const [dropKey, setDropKey] = useState(0);
  // Totals are scoped to a calendar month, defaulting to the current one.
  // The HUD's month stepper pages through them.
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
    const [cats, untaggedTx, totalSpend, totalReceived, categoryTotals, runningBalance, months, pnb] =
      await Promise.all([
        getCategories(),
        getUncategorized(range),
        getTotalSpend(range),
        getTotalReceived(range),
        getCategoryTotals(range),
        getBalance(range),
        getSavingsMonths(range),
        getSavingsFund(range),
      ]);
    setCategories(cats);
    setUntagged(untaggedTx);
    setTotal(totalSpend);
    setReceived(totalReceived);
    setTotals(categoryTotals);
    setBalance(runningBalance);
    setSavingsMonths(months);
    setFund(pnb);
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
  // know when fresh rows have actually landed. Each foreground also drops the
  // coins for the spends to sort again.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        setDropKey((k) => k + 1);
        runIngest({}).then(load);
      }
    });
    return () => sub.remove();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setDropKey((k) => k + 1);
    setRefreshing(true);
    const started = Date.now();
    await load();
    // Long enough to read, even when the reload is instant.
    setTimeout(() => setRefreshing(false), Math.max(0, 700 - (Date.now() - started)));
  }, [load]);

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

  const openCategory = useCallback(
    (categoryId: string) => navigation.navigate('CategoryDetail', { categoryId }),
    [navigation]
  );

  // ---- walking between rooms, step by step (see walk.ts)
  const [step, setStep] = useState<Step>(() => restStep('main'));
  const [walking, setWalking] = useState(false);
  const busy = useRef(false);
  const fade = useSharedValue(0);
  const camX = useSharedValue(0);
  const [catWidth, setCatWidth] = useState(SCREEN_W);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);


  /** Plays steps one per STEP_MS, then calls done. */
  const play = useCallback((steps: Step[], done: () => void) => {
    steps.forEach((st, i) => later(i * STEP_MS, () => setStep(st)));
    later(steps.length * STEP_MS, done);
  }, []);

  const go = useCallback(
    (from: Room, to: Room) => {
      if (busy.current || from === to) return;
      // Savings is through the categories room; going up from it walks through both.
      if (from === 'savings' && to === 'main') {
        busy.current = true;
        setWalking(true);
        const leg1 = exitPath('savings', 'categories');
        play(leg1, () => {
          fade.value = withTiming(1, { duration: 140 });
          later(150, () => {
            setRoom('categories');
            camX.value = Math.max(catWidth - SCREEN_W, 0);
            fade.value = withTiming(0, { duration: 180 });
            play([...enterPath('savings', 'categories')], () => {
              busy.current = false;
              go('categories', 'main');
            });
          });
        });
        return;
      }
      busy.current = true;
      setWalking(true);
      // Face the right end of the wall before walking to its door.
      const startCam = from === 'categories' ? (to === 'savings' ? Math.max(catWidth - SCREEN_W, 0) : 0) : camX.value;
      const panMs = Math.abs(camX.value - startCam) > 4 ? 450 : 0;
      if (panMs) camX.value = withTiming(startCam, { duration: panMs, easing: Easing.inOut(Easing.quad) });
      later(panMs, () =>
        play(exitPath(from, to), () => {
          fade.value = withTiming(1, { duration: 140 });
          later(150, () => {
            setRoom(to);
            camX.value = to === 'categories' && from === 'savings' ? Math.max(catWidth - SCREEN_W, 0) : 0;
            fade.value = withTiming(0, { duration: 180 });
            play(enterPath(from, to), () => {
              busy.current = false;
              setWalking(false);
              setStep(restStep(to));
            });
          });
        })
      );
    },
    [camX, catWidth, fade, play]
  );

  // Android back climbs back up to the main room before leaving the app.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (room === 'main') return false;
        go(room, room === 'savings' ? 'categories' : 'main');
        return true;
      });
      return () => sub.remove();
    }, [room, go])
  );

  // One gesture for the whole world, like a game camera:
  //  - up/down: take the stairs (or pull down on the main room to refresh)
  //  - sideways: look along the room; drag past its end and you walk through that door
  // The gesture's callbacks can outlive the render that made them, so everything
  // they read that changes — the room, its width, what to do — comes through refs.
  const live = useRef({ room, catWidth, go, handleRefresh });
  live.current = { room, catWidth, go, handleRefresh };
  const startX = useSharedValue(0);
  const axis = useSharedValue<0 | 1 | 2>(0); // 0 undecided, 1 horizontal, 2 vertical
  const worldGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-12, 12])
    .activeOffsetY([-12, 12])
    .onStart(() => {
      startX.value = camX.value;
      axis.value = 0; // decided on the first real movement — at start the translation is still 0
    })
    .onUpdate((e) => {
      if (axis.value === 0 && Math.max(Math.abs(e.translationX), Math.abs(e.translationY)) > 8) {
        axis.value = Math.abs(e.translationX) > Math.abs(e.translationY) ? 1 : 2;
      }
      if (busy.current || axis.value !== 1) return;
      const { room: r, catWidth: cw } = live.current;
      const max = Math.max((r === 'categories' ? cw : r === 'savings' ? SAVINGS_WIDTH : SCREEN_W) - SCREEN_W, 0);
      let x = startX.value - e.translationX;
      if (x < 0) x *= 0.35;
      else if (x > max) x = max + (x - max) * 0.35;
      camX.value = x;
    })
    .onEnd((e) => {
      if (busy.current) return;
      const { room: r, catWidth: cw, go: walkTo, handleRefresh: refresh } = live.current;
      if (axis.value === 0) axis.value = Math.abs(e.translationX) > Math.abs(e.translationY) ? 1 : 2;
      if (axis.value === 2) {
        if (r === 'main') {
          if (e.translationY < -60) walkTo('main', 'categories');
          else if (e.translationY > 70) refresh();
        } else if (e.translationY > 70) {
          walkTo(r, 'main');
        }
        return;
      }
      const max = Math.max((r === 'categories' ? cw : r === 'savings' ? SAVINGS_WIDTH : SCREEN_W) - SCREEN_W, 0);
      if (r === 'categories' && camX.value > max + DOOR_PULL) {
        camX.value = withSpring(max, { damping: 20 });
        walkTo('categories', 'savings');
      } else if (r === 'categories' && camX.value < -DOOR_PULL) {
        camX.value = withSpring(0, { damping: 20 });
        walkTo('categories', 'main');
      } else if (r === 'savings' && camX.value < -DOOR_PULL) {
        camX.value = withSpring(0, { damping: 20 });
        walkTo('savings', 'categories');
      } else if (camX.value < 0 || camX.value > max) {
        camX.value = withSpring(Math.min(Math.max(camX.value, 0), max), { damping: 20 });
      } else {
        camX.value = withDecay({ velocity: -e.velocityX, clamp: [0, max] });
      }
    });

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const savingsNet = savingsMonths.reduce((a, m) => a + m.deposited - m.withdrawn, 0);

  return (
    <View
      style={styles.screen}
      onLayout={(e) => {
        setViewportHeight(e.nativeEvent.layout.height);
        if (!busy.current) setStep(restStep(room));
      }}
    >
      <GestureDetector gesture={worldGesture}>
        <View style={StyleSheet.absoluteFill}>
          {room === 'main' && (
            <MainRoom coins={queueCount} dropKey={dropKey} onMunim={() => setSettingsOpen(true)} onStairs={() => go('main', 'categories')} />
          )}
          {room === 'categories' && (
            <CategoriesRoom
              camX={camX}
              onWidth={setCatWidth}
              categories={categories}
              totals={totals}
              onOpenCategory={openCategory}
              onCategoryCreated={handleCategoryCreated}
              onUp={() => go('categories', 'main')}
              onSavings={() => go('categories', 'savings')}
            />
          )}
          {room === 'savings' && (
            <SavingsRoom
              camX={camX}
              months={savingsMonths}
              onOpenSavings={() => openCategory(SAVINGS_ID)}
              onBack={() => go('savings', 'categories')}
            />
          )}
          <Kuhi step={step} interactive={!walking} bubbleSide="right" />
          <KuhiPreload />
        </View>
      </GestureDetector>

      <Hud month={month} onShiftMonth={shiftMonth} canGoForward={canGoForward} spent={total} balance={balance} received={received} />

      {room === 'main' && (
        <View style={styles.cards}>
          <SortStack
            transactions={untagged}
            categories={categories}
            onTag={handleTag}
            onCategoryCreated={handleCategoryCreated}
            onQueueChange={setQueueCount}
          />
        </View>
      )}

      {room === 'categories' && !walking && (
        <DoorSign label="savings" top={GULLAK_LAYOUT.openings.savingsFromRightStrip.y - 6} onPress={() => go('categories', 'savings')} />
      )}

      {room === 'savings' && (
        <Pressable style={styles.fundWrap} onPress={() => openCategory(SAVINGS_ID)} accessibilityRole="button" accessibilityLabel="Savings fund">
          <PixelPanel border={W.greenSoft} shadow={3} style={styles.fund}>
            <View style={styles.fundStripe} />
            <Text style={styles.fundLabel}>savings fund</Text>
            <Text style={styles.fundAmount}>{rupees(fund ?? savingsNet)}</Text>
          </PixelPanel>
        </Pressable>
      )}

      <View style={[styles.dots, { top: room === 'main' && queueCount > 0 ? 284 : 174 }]} pointerEvents="none">
        {ROOMS.map((r) => (
          <View key={r} style={[styles.dot, r === room && styles.dotOn]} />
        ))}
      </View>

      {refreshing && (
        <View style={styles.refresh} pointerEvents="none">
          <PixelPanel b={2} style={styles.refreshPanel}>
            <Text style={styles.refreshText}>shaking the gullak…</Text>
          </PixelPanel>
        </View>
      )}

      <Animated.View style={[StyleSheet.absoluteFill, styles.fade, fadeStyle]} pointerEvents="none" />
      <ColorPickerModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EDB89C', overflow: 'hidden' },
  cards: { position: 'absolute', top: 180, left: 12, right: 12 },
  fundWrap: { position: 'absolute', top: 186, left: 12, right: 12 },
  fund: { height: 64, justifyContent: 'center', paddingLeft: 22 },
  fundStripe: { position: 'absolute', left: 3, top: 3, bottom: 3, width: 6, backgroundColor: W.greenPale },
  fundLabel: { ...pixelText(4), color: W.clayLabel },
  fundAmount: { ...pixelText(8), color: W.ink, marginTop: 2 },
  dots: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  dot: { width: 8, height: 6, backgroundColor: '#7A4A3C', opacity: 0.35 },
  dotOn: { width: 14, opacity: 1 },
  refresh: { position: 'absolute', top: 300, left: 0, right: 0, alignItems: 'center' },
  refreshPanel: { paddingHorizontal: 14, paddingVertical: 8 },
  refreshText: { ...pixelText(4), color: W.ink },
  fade: { backgroundColor: '#3A2320' },
});
