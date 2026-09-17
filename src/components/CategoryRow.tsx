import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { base } from '../theme/colors';
import { sizing, typography, heading } from '../theme/tokens';
import { Category, CategoryTotal } from '../data/db';
import { iconForCategory } from '../data/categories';

type Props = {
  category: Category;
  total: CategoryTotal;
  /** The largest spent + received across the list; bars are drawn against it. */
  scale: number;
  onPress: () => void;
};

const MIN_SEGMENT = 0.02;

function formatRupees(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function CategoryRow({ category, total, scale, onPress }: Props) {
  const icon = iconForCategory(category);
  // A net-negative savings month is still drawn as an empty bar, not a
  // negative width.
  const spent = Math.max(total.spent, 0);
  const received = Math.max(total.received, 0);
  const safeScale = scale > 0 ? scale : 1;
  const spentShare = spent > 0 ? Math.max(spent / safeScale, MIN_SEGMENT) : 0;
  const receivedShare = received > 0 ? Math.max(received / safeScale, MIN_SEGMENT) : 0;

  return (
    <Pressable style={[styles.row, category.hidden && styles.hidden]} onPress={onPress}>
      <View style={styles.iconWrap}>
        {icon ? (
          <Image source={icon} style={styles.icon} resizeMode="contain" />
        ) : (
          <View style={[styles.fallbackDot, { backgroundColor: category.colorHex }]} />
        )}
      </View>

      <View style={styles.middle}>
        <View style={styles.topLine}>
          <Text style={styles.label} numberOfLines={1}>{category.label}</Text>
          <View style={styles.amounts}>
            {total.received > 0 && (
              <Text style={[styles.amount, styles.received]}>+{formatRupees(total.received)}</Text>
            )}
            {(total.spent !== 0 || total.received === 0) && (
              <Text style={styles.amount}>{formatRupees(total.spent)}</Text>
            )}
          </View>
        </View>
        {/* One track, two segments: red for money out, green for money in. */}
        <View style={styles.barTrack}>
          {spentShare > 0 && (
            <View style={[styles.segment, { flex: spentShare, backgroundColor: base.negative }]} />
          )}
          {receivedShare > 0 && (
            <View style={[styles.segment, { flex: receivedShare, backgroundColor: base.positive }]} />
          )}
          <View style={{ flex: Math.max(1 - spentShare - receivedShare, 0) }} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sizing.scale500,
    gap: sizing.scale600,
  },
  hidden: { opacity: 0.4 },
  // No tile behind the icon — the artwork sits directly on the page. Sized to
  // the artwork exactly: a wider box centred the icon inside it, which pushed
  // the icon 8px further from the screen edge than the amount is on the right
  // and made the row look lopsided.
  iconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 44, height: 44 },
  fallbackDot: { width: 20, height: 20, borderRadius: 10 },
  middle: { flex: 1 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: sizing.scale200 },
  label: { ...typography.LabelMedium, color: base.contentPrimary, flexShrink: 1 },
  amounts: { flexDirection: 'row', gap: sizing.scale300 },
  amount: { ...heading.Body, color: base.contentSecondary },
  received: { color: base.positive },
  barTrack: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    backgroundColor: base.backgroundTertiary,
    overflow: 'hidden',
    gap: 2,
  },
  segment: { height: '100%' },
});
