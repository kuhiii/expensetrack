import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PixelPanel, W, pixelText, rupees, rupeesShort } from './pixel';
import { formatMonthLabel } from '../utils/dateFormat';

type Props = {
  month: { year: number; month: number };
  onShiftMonth: (delta: number) => void;
  canGoForward: boolean;
  spent: number;
  balance: number;
  received: number;
};

/** The fixed panel at the top of every room: month, money spent, balance and money in. */
export function Hud({ month, onShiftMonth, canGoForward, spent, balance, received }: Props) {
  return (
    <PixelPanel style={styles.hud} shadow={4}>
      <View style={styles.header}>
        <Pressable
          onPress={() => onShiftMonth(-1)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <PixelPanel fill={W.periwinkleLight} border={W.periwinkleLight} b={2} style={styles.arrow}>
            <Text style={styles.arrowText}>‹</Text>
          </PixelPanel>
        </Pressable>
        <Text style={styles.month}>{formatMonthLabel(month.year, month.month)}</Text>
        <Pressable
          onPress={() => canGoForward && onShiftMonth(1)}
          disabled={!canGoForward}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <PixelPanel
            fill={W.periwinkleLight}
            border={W.periwinkleLight}
            b={2}
            style={[styles.arrow, !canGoForward && styles.arrowOff]}
          >
            <Text style={styles.arrowText}>›</Text>
          </PixelPanel>
        </Pressable>
      </View>

      <Text style={styles.caption}>spent this month</Text>
      <Text style={styles.spent} numberOfLines={1} adjustsFontSizeToFit>
        {rupees(spent)}
      </Text>

      <View style={styles.divider} />
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>balance</Text>
          <Text style={[styles.value, balance < 0 && { color: W.red }]}>
            {balance < 0 ? '-' : ''}
            {rupees(Math.abs(balance))}
          </Text>
        </View>
        <View style={styles.split} />
        <View style={styles.half}>
          <Text style={styles.label}>in</Text>
          <Text style={[styles.value, { color: W.green }]}>+{rupeesShort(received)}</Text>
        </View>
      </View>
    </PixelPanel>
  );
}

const styles = StyleSheet.create({
  hud: { marginHorizontal: 12, marginTop: 12, height: 154 },
  header: {
    marginTop: 3,
    marginHorizontal: 3,
    height: 40,
    backgroundColor: W.periwinkle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 7,
  },
  arrow: { width: 30, height: 26, alignItems: 'center', justifyContent: 'center' },
  arrowOff: { opacity: 0.4 },
  arrowText: { ...pixelText(6), color: W.cream },
  month: { ...pixelText(6), color: W.cream },
  caption: { ...pixelText(4), color: W.inkSoft, textAlign: 'center', marginTop: 14 },
  spent: { ...pixelText(10), color: W.ink, textAlign: 'center', marginTop: 6 },
  divider: { height: 1.5, backgroundColor: W.paperDim, marginHorizontal: 16, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', height: 36 },
  half: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: 7 },
  split: { width: 1.5, height: 22, backgroundColor: W.paperDim },
  label: { ...pixelText(4), color: W.inkSoft },
  // 'none': the lakh 'L' must stay a capital — lowercased it reads as a 1.
  value: { ...pixelText(5), color: W.ink, textTransform: 'none' },
});
