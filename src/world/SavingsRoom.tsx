import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { GULLAK_LAYOUT } from './gullakLayout';
import { LEAF_IMAGES } from './leafImages';
import { PixelPanel, W, pixelText, rupeesShort } from './pixel';
import { SavingsMonth } from '../data/db';

const ROOM = require('../../assets/gullak/savings-room.png');
const S = GULLAK_LAYOUT.savings;
const LF = GULLAK_LAYOUT.leaf;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** One art pixel. The stem is drawn from these so it stays on the pixel grid. */
const PX = 2;
const NODE_GAP = 28;

type Props = {
  months: SavingsMonth[];
  onOpenSavings: () => void;
  onBack: () => void;
  camX: SharedValue<number>;
};

export const SAVINGS_WIDTH = S.width;

type Leaf = { key: string; label: string; side: 'L' | 'R'; bucket: number; state: 'green' | 'wilt'; ghost: number | null; x: number; y: number };

/** Stem x at a height: a gentle sway, snapped to the pixel grid. */
const stemX = (baseY: number, y: number) => S.soilX + Math.round(Math.sin((baseY - y) / 36) * 1.5) * PX;
const bucketOf = (share: number) => Math.max(0, Math.min(9, Math.round(share * 10) - 1));

/**
 * Level 2, the savings room: only the tulsi. It grows one leaf for every month
 * you saved, sized by how much against your best month; a month you took money
 * out of shrinks, keeping a dotted outline of what it had grown to, and yellows
 * once it has lost more than half. Tap a leaf to see its month.
 */
export function SavingsRoom({ months, onOpenSavings, onBack, camX }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const camStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -camX.value }] }));

  const { leaves, stemTop } = useMemo(() => {
    const grown = months.filter((m) => m.deposited > 0 || m.withdrawn > 0);
    const amounts = grown.map((m) => Math.max(m.deposited - m.withdrawn, 0));
    const best = Math.max(...grown.map((m) => m.deposited), 1);
    const out: Leaf[] = grown.map((m, i) => {
      const amt = amounts[i];
      const y = S.soilY - 32 - i * NODE_GAP;
      const side: 'L' | 'R' = i % 2 === 0 ? 'L' : 'R';
      const withdrew = m.withdrawn > 0;
      const label = withdrew
        ? `${MONTHS[m.month]} +${rupeesShort(amt)} · ${rupeesShort(m.withdrawn)} out`
        : `${MONTHS[m.month]} +${rupeesShort(amt)}`;
      return {
        key: `${m.year}-${m.month}`,
        label,
        side,
        bucket: bucketOf(amt / best),
        state: withdrew && amt < m.deposited / 2 ? 'wilt' : 'green',
        ghost: withdrew ? bucketOf(m.deposited / best) : null,
        x: stemX(S.soilY, y) + (side === 'R' ? PX : 0),
        y,
      };
    });
    return { leaves: out, stemTop: S.soilY - 32 - Math.max(grown.length - 1, 0) * NODE_GAP - 20 };
  }, [months]);

  const stem = [];
  for (let y = S.soilY; y >= stemTop; y -= PX) {
    const x = stemX(S.soilY, y);
    stem.push(<View key={y} style={[styles.stemPx, { left: x - PX, top: y, backgroundColor: y > S.soilY - 40 ? LF.stemLight : LF.stem }]} />);
  }

  const pickedLeaf = leaves.find((l) => l.key === picked);

  return (
    <Animated.View style={[styles.world, camStyle]}>
      <Pressable style={{ width: S.width, height: 780 }} onPress={() => setPicked(null)}>
        <Image source={ROOM} style={{ position: 'absolute', width: S.width, height: 780 }} fadeDuration={0} />
        <Pressable
          style={{ position: 'absolute', left: S.shrine.x, top: S.shrine.y, width: S.shrine.w, height: S.shrine.h }}
          onPress={onOpenSavings}
          accessibilityRole="button"
          accessibilityLabel="Savings transactions"
        />
        {stem}
        <View style={[styles.bud, { left: stemX(S.soilY, stemTop) - 4, top: stemTop - 8, backgroundColor: LF.bud, borderColor: LF.budDark }]} />
        {leaves.map((l) => (
          <React.Fragment key={l.key}>
            {l.ghost !== null && (
              <Image source={LEAF_IMAGES[`${l.side}-${l.ghost}-ghost`]} style={leafPos(l)} fadeDuration={0} />
            )}
            <Pressable onPress={() => setPicked((p) => (p === l.key ? null : l.key))} style={leafPos(l)} accessibilityRole="button" accessibilityLabel={l.label}>
              <Image source={LEAF_IMAGES[`${l.side}-${l.bucket}-${l.state}`]} style={styles.leafImg} fadeDuration={0} />
            </Pressable>
          </React.Fragment>
        ))}
        {pickedLeaf && (
          <View style={[styles.callout, { left: Math.max(8, pickedLeaf.x - 85), top: pickedLeaf.y - 92 }]}>
            <PixelPanel fill={W.greenWash} border={W.greenSoft} b={2} style={styles.calloutPanel}>
              <Text style={styles.calloutText}>{pickedLeaf.label}</Text>
            </PixelPanel>
          </View>
        )}
        <Pressable style={[styles.door, { left: S.backDoor.x, top: S.backDoor.y, width: S.backDoor.w, height: S.backDoor.h }]} onPress={onBack} accessibilityRole="button" accessibilityLabel="Door back to the categories room" />
        <Text style={[styles.doorLabel, { left: S.backDoor.labelX - 30, top: S.backDoor.labelY - 14 }]}>‹ categories</Text>
      </Pressable>
    </Animated.View>
  );
}

function leafPos(l: Leaf) {
  const a = l.side === 'R' ? LF.anchorR : LF.anchorL;
  return { position: 'absolute' as const, left: l.x - a.x, top: l.y - a.y, width: LF.w, height: LF.h };
}

const styles = StyleSheet.create({
  world: { position: 'absolute', left: 0, top: 0, width: S.width, height: 780 },
  stemPx: { position: 'absolute', width: 2 * PX, height: PX },
  bud: { position: 'absolute', width: 8, height: 10, borderRadius: 4, borderWidth: 2 },
  leafImg: { width: LF.w, height: LF.h },
  callout: { position: 'absolute', width: 170 },
  calloutPanel: { paddingVertical: 8, paddingHorizontal: 10 },
  calloutText: { ...pixelText(4), color: W.ink },
  door: { position: 'absolute' },
  doorLabel: { position: 'absolute', width: 120, textAlign: 'center', ...pixelText(4), color: W.clayLabel },
});
