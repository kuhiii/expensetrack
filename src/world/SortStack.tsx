import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, TextInput } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'react-native';
import { base } from '../theme/colors';
import { sizing, radius, typography, heading } from '../theme/tokens';
import { useAccent } from '../theme/ThemeContext';
import { Transaction, Category } from '../data/db';
import { CategoryPickerRow } from '../components/CategoryPickerRow';
import { BottomSheet } from '../components/BottomSheet';
import { PixelPanel, W, pixelText, rupees } from './pixel';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** e.g. "28 sep · hdfc" */
function chitLine(tx: Transaction): string {
  const d = new Date(tx.timestamp);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${tx.bank}`;
}

/**
 * The spends waiting to be sorted, as a stack of paper chits under the HUD —
 * swipe right to sort (tag), left to skip. Same queue and gesture logic as the
 * original UntaggedStack, dressed for the gullak.
 *
 * A swipeable queue of untagged transactions.
 *
 * The structural rule here — and what an earlier version got wrong — is that
 * each card owns its own animation values and is *unmounted* once swiped
 * away. Nothing outside a card ever writes to the value that card is
 * animating. Reusing a single card view and resetting its shared value
 * between transactions produced a string of races instead: a cancelled
 * animation still fires its callback (with finished=false), so the reset
 * either stranded the card off-screen or counted as a second swipe.
 */

const SCREEN_W = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 90;
const CARD_HEIGHT = 86;
const EXIT_X = SCREEN_W * 1.25;
/** How far the top card travels before the one behind fully takes its place. */
const PROMOTE_DISTANCE = SCREEN_W * 0.6;
/** The leaving card is transparent by here, so it never masks the card behind. */
const FADE_OUT_DISTANCE = SCREEN_W * 0.45;
const VISIBLE = 3;

/** Resting pose per depth: 0 is the active card, 1 and 2 sit behind it. */
const DEPTH = [
  { dx: 0, dy: 0, scale: 1, rotate: 0 },
  { dx: 0, dy: 6, scale: 0.965, rotate: 0 },
  { dx: 0, dy: 12, scale: 0.93, rotate: 0 },
];

type Props = {
  transactions: Transaction[];
  categories: Category[];
  onTag: (transactionId: string, categoryId: string, note?: string) => void;
  onCategoryCreated: (categoryId: string, label: string, iconKey: string | null) => void;
  /** Lets the room know how many chits are left (the coins on the floor follow it). */
  onQueueChange?: (count: number) => void;
};

type CardProps = {
  tx: Transaction;
  depth: number;
  isTop: boolean;
  /** The active card's drag offset, so the cards behind can move up a depth. */
  dragX: SharedValue<number>;
  onSkip: (id: string) => void;
  onTagRequest: (tx: Transaction) => void;
  /** True while this card's tag sheet is open, which holds it fully accent. */
  isTagging: boolean;
  position: number;
  count: number;
};

function SwipeCard({ tx, depth, isTop, dragX, onSkip, onTagRequest, isTagging, position, count }: CardProps) {
  const { accent } = useAccent();
  // Owned by this card alone, and it starts at rest. Because the card is
  // unmounted when it leaves, this never has to be reset for the next one.
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  // 0 = the card's own pastel, 1 = fully the app accent.
  const tagged = useSharedValue(0);
  // Set once the card is on its way off-screen, so the safety reset in
  // onFinalize doesn't haul it back mid-exit.
  const exiting = useSharedValue(false);

  useEffect(() => {
    tagged.value = withTiming(isTagging ? 1 : 0, { duration: 200 });
  }, [isTagging, tagged]);

  const pan = Gesture.Pan()
    .enabled(isTop)
    // Only take over once the drag is clearly horizontal, so the page can
    // still be scrolled vertically from on top of a card.
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = e.translationY * 0.15;
      dragX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD) {
        exiting.value = true;
        y.value = withSpring(0);
        // Carry the cards behind along with the exit. Without this dragX
        // stays wherever the finger let go, so their promotion stalls
        // part-way through and then jumped to its resting pose in a single
        // frame once the skip landed — which looked like the next card
        // clipping into place a beat late.
        dragX.value = withTiming(-EXIT_X, { duration: 200 });
        x.value = withTiming(-EXIT_X, { duration: 200 }, (finished) => {
          if (finished) runOnJS(onSkip)(tx.id);
        });
      } else if (e.translationX > SWIPE_THRESHOLD) {
        // Tagging keeps the card in place and opens the picker over it.
        // Committing the tint here, on the UI thread, rather than leaving it
        // to `isTagging`: springing x back to 0 drops the drag tint on the
        // very next frame, while the prop only arrives a render later — so
        // the card flashed back to its pastel before turning accent.
        tagged.value = withTiming(1, { duration: 200 });
        runOnJS(onTagRequest)(tx);
      }
      // Everything that isn't an exit settles back in onFinalize.
    })
    // onEnd is skipped entirely when the gesture is cancelled rather than
    // ended — which is exactly what happens when the tag sheet's Modal takes
    // the touch out from under it — and the card was left stranded wherever
    // the finger was, tilted and offset, with the stack behind it frozen
    // half-promoted. onFinalize always runs, so rest is restored from here
    // however the gesture terminates.
    .onFinalize(() => {
      if (exiting.value) return;
      x.value = withSpring(0);
      y.value = withSpring(0);
      dragX.value = withSpring(0);
    });

  const topStyle = useAnimatedStyle(() => ({
    // Fades on the way out: otherwise the leaving card slides over the card
    // behind and hides its left-aligned text until it clears the screen, so
    // the next amount popped in rather than being revealed.
    opacity: interpolate(
      Math.abs(x.value),
      [SWIPE_THRESHOLD, FADE_OUT_DISTANCE],
      [1, 0],
      Extrapolation.CLAMP
    ),
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      {
        rotate: `${interpolate(
          x.value,
          [-SCREEN_W / 2, 0, SCREEN_W / 2],
          [-10, 0, 10],
          Extrapolation.CLAMP
        )}deg`,
      },
    ],
  }));

  // Cards behind rise one depth as the active card is dragged away, so the
  // next transaction visibly takes its place instead of appearing suddenly.
  const behindStyle = useAnimatedStyle(() => {
    const p = interpolate(
      Math.abs(dragX.value),
      [0, PROMOTE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP
    );
    const from = DEPTH[Math.min(depth, DEPTH.length - 1)];
    const to = DEPTH[Math.max(depth - 1, 0)];
    return {
      transform: [
        { translateX: from.dx + (to.dx - from.dx) * p },
        { translateY: from.dy + (to.dy - from.dy) * p },
        { scale: from.scale + (to.scale - from.scale) * p },
        { rotate: `${from.rotate + (to.rotate - from.rotate) * p}deg` },
      ],
    };
  });

  // Tints toward the accent as the card is dragged right, and stays there
  // once the tag sheet is open.
  const tintStyle = useAnimatedStyle(() => {
    const dragTint = interpolate(x.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP);
    return { opacity: Math.max(dragTint, tagged.value) * 0.35 };
  });

  const tagHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));
  const skipHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.card,
          styles.stacked,
          // Stacking order must be explicit: with every card at the same
          // elevation, Android paints remounted siblings over the active one.
          { zIndex: VISIBLE - depth, elevation: isTop ? 3 : Math.max(2 - depth, 0) },
          isTop ? topStyle : behindStyle,
        ]}
      >
        <PixelPanel style={StyleSheet.absoluteFill} fill={depth === 0 ? W.paper : depth === 1 ? '#F3E8D6' : '#E9DCC6'} b={depth === 0 ? 3 : 2} shadow={depth === 0 ? 3 : 0}>
          <Animated.View style={[styles.tint, { backgroundColor: accent }, tintStyle]} />
        </PixelPanel>
        {depth === 0 && (
          <>
            <View style={styles.stripe} />
            <View style={styles.cardContent}>
              <View style={styles.topLine}>
                <Image source={require('../../assets/gullak/coin-gold.png')} style={styles.coin} />
                <View style={styles.who}>
                  <Text style={styles.payee} numberOfLines={1}>{tx.payee}</Text>
                  <Text style={styles.when} numberOfLines={1}>{chitLine(tx)}</Text>
                </View>
                <Text style={styles.amount}>
                  {tx.direction === 'credit' ? '+' : ''}{rupees(tx.amount)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.bottomLine}>
                <Text style={styles.swipeHint}>swipe right to sort  › › ›</Text>
                <Text style={styles.count}>{position} of {count}</Text>
              </View>
            </View>
          </>
        )}

        {isTop && (
          <>
            <Animated.View style={[styles.hint, styles.hintLeft, skipHintStyle]}>
              <Text style={styles.hintText}>skip</Text>
            </Animated.View>
            <Animated.View style={[styles.hint, styles.hintRight, { backgroundColor: accent }, tagHintStyle]}>
              <Text style={[styles.hintText, styles.hintTextOn]}>sort</Text>
            </Animated.View>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export function SortStack({ transactions, categories, onTag, onCategoryCreated, onQueueChange }: Props) {
  // Local ordering, so skipping can move a card to the back of the queue
  // without touching the database. Re-synced whenever the parent reloads.
  const [queue, setQueue] = useState<Transaction[]>(transactions);
  const [pickerFor, setPickerFor] = useState<Transaction | null>(null);
  const [note, setNote] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  // How many times each transaction has been skipped round to the back. It
  // only exists to be part of the card's key — see handleSkip.
  const [passes, setPasses] = useState<Record<string, number>>({});
  const dragX = useSharedValue(0);
  const { accent } = useAccent();

  // Merge rather than replace. The parent reloads the list after every tag,
  // and assigning it wholesale threw away the local ordering — so the stack
  // jumped back to the first card instead of carrying on from the next one.
  // Survivors keep their current position, tagged rows drop out, and
  // anything new joins the back of the queue.
  useEffect(() => {
    setQueue((prev) => {
      const incoming = new Map(transactions.map((t) => [t.id, t]));
      const kept = prev
        .map((t) => incoming.get(t.id))
        .filter((t): t is Transaction => t !== undefined);
      const keptIds = new Set(kept.map((t) => t.id));
      return [...kept, ...transactions.filter((t) => !keptIds.has(t.id))];
    });
  }, [transactions]);

  useEffect(() => {
    onQueueChange?.(queue.length);
  }, [queue.length, onQueueChange]);

  const handleSkip = (id: string) => {
    // Cleared in the same commit that reorders the queue, so the cards behind
    // settle back to their resting poses exactly as their content shifts up.
    dragX.value = 0;
    // Bumping the pass count changes the card's key, which forces a genuine
    // remount with fresh animation values. Skipping only rotates the card to
    // the back of the queue, so once the queue is down to VISIBLE or fewer
    // the same card stays rendered — still holding the offset and the
    // `exiting` flag left over from its exit animation. That is why the stack
    // came apart near the end of the list and not before it.
    setPasses((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
    setQueue((q) => {
      const i = q.findIndex((t) => t.id === id);
      if (i < 0) return q;
      return [...q.slice(0, i), ...q.slice(i + 1), q[i]];
    });
  };

  const closePicker = () => {
    setPickerFor(null);
    setNote('');
    setChosen(null);
  };

  /**
   * Tapping a category only selects it — tagging waits for "okay", so there's
   * room to write a note first. Committing on tap closed the sheet before the
   * note could be typed.
   */
  const confirmTag = () => {
    const tx = pickerFor;
    const categoryId = chosen;
    const typed = note;
    closePicker();
    if (tx && categoryId) onTag(tx.id, categoryId, typed);
  };

  if (queue.length === 0) return null;

  const visible = queue.slice(0, VISIBLE).map((tx, depth) => ({ tx, depth }));
  // How far the deepest rendered card hangs below the top one.
  const fanDepth = DEPTH[visible.length - 1].dy;

  return (
    <View style={styles.section}>
      {/* Only reserve room for the chits actually fanned out behind. */}
      <View style={[styles.stack, { height: CARD_HEIGHT + fanDepth }]}>
        {/* Deepest first so each card paints over the one behind it. */}
        {[...visible].reverse().map(({ tx, depth }) => (
          <SwipeCard
            key={`${tx.id}#${passes[tx.id] ?? 0}`}
            tx={tx}
            depth={depth}
            isTop={depth === 0}
            dragX={dragX}
            onSkip={handleSkip}
            onTagRequest={setPickerFor}
            isTagging={pickerFor?.id === tx.id}
            position={1}
            count={queue.length}
          />
        ))}
      </View>

      <BottomSheet visible={pickerFor !== null} onClose={closePicker}>
      <Text style={styles.sheetTitle}>
        {pickerFor
          ? `${pickerFor.direction === 'credit' ? '+' : ''}₹${pickerFor.amount.toLocaleString('en-IN')} · ${pickerFor.payee}`
          : ''}
      </Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="add a note (optional)"
        placeholderTextColor={base.contentTertiary}
        style={styles.noteInput}
        returnKeyType="done"
      />
      <Text style={styles.sheetSubtitle}>pick a category</Text>
      <CategoryPickerRow
        categories={categories}
        onPick={setChosen}
        onCategoryCreated={onCategoryCreated}
        selectedId={chosen}
      />

      <Pressable
        onPress={confirmTag}
        disabled={!chosen}
        style={[
          styles.okayButton,
          { backgroundColor: chosen ? accent : base.borderOpaque },
        ]}
      >
        <Text style={styles.okayText}>okay</Text>
      </Pressable>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {},
  stack: {},
  card: { height: CARD_HEIGHT },
  // Every card occupies the same slot; only the transforms differ.
  stacked: { position: 'absolute', left: 0, right: 0, top: 0 },
  tint: { position: 'absolute', left: 3, right: 3, top: 3, bottom: 3 },
  stripe: { position: 'absolute', left: 3, top: 3, bottom: 3, width: 6, backgroundColor: W.mustard },
  cardContent: { flex: 1, paddingLeft: 18, paddingRight: 16, paddingTop: 10 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coin: { width: 36, height: 36 },
  who: { flex: 1 },
  payee: { ...pixelText(6), color: W.ink },
  when: { ...pixelText(4, false), color: W.inkSoft, marginTop: 2 },
  amount: { ...pixelText(8), color: W.ink },
  divider: { height: 1.5, backgroundColor: W.paperDim, marginTop: 6, marginBottom: 5 },
  bottomLine: { flexDirection: 'row', justifyContent: 'space-between' },
  swipeHint: { ...pixelText(4), color: W.green },
  count: { ...pixelText(4), color: W.inkSoft },
  hint: {
    position: 'absolute',
    top: -14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: W.paperDim,
  },
  hintLeft: { left: 14 },
  hintRight: { right: 14 },
  hintText: { ...pixelText(4), color: W.ink },
  hintTextOn: { color: W.paper },
  sheetTitle: { ...heading.Medium, color: base.contentPrimary },
  noteInput: {
    backgroundColor: base.backgroundSecondary,
    borderRadius: radius.radius300,
    paddingHorizontal: sizing.scale600,
    paddingVertical: sizing.scale500,
    marginTop: sizing.scale400,
    marginBottom: sizing.scale500,
    ...typography.ParagraphMedium,
    color: base.contentPrimary,
  },
  okayButton: {
    marginTop: sizing.scale800,
    borderRadius: radius.radius300,
    paddingVertical: sizing.scale500,
    alignItems: 'center',
  },
  okayText: { ...heading.Body, color: base.primaryB },
  sheetSubtitle: { ...typography.ParagraphSmall, color: base.contentSecondary, marginBottom: sizing.scale400 },
});
