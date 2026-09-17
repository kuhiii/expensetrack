import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, Pressable } from 'react-native';
import { base } from '../theme/colors';
import { sizing, radius, typography, heading, elevation } from '../theme/tokens';
import { useAccent } from '../theme/ThemeContext';
import { CatMascot, CAT_ART_ASPECT, CAT_BODY_BOTTOM_RATIO, CAT_TORSO_RATIO } from './CatMascot';
import { ColorPickerModal } from './ColorPickerModal';
import { CardSurface } from './CardSurface';
import { formatMonthLabel } from '../utils/dateFormat';

/** Cat art width, as a share of the card's width. */
const CAT_WIDTH_RATIO = 0.4;
/** Cat art's inset from the card's left edge — clears the corner radius. */
const CAT_LEFT_INSET = sizing.scale600;

const GUTTER = sizing.scale500;

/** plant.png is fully bled — its visible art is the whole file. */
const PLANT_ASPECT = 915 / 1131;
/** Multiples of the cat's torso: matching it exactly read too small. */
const PLANT_SCALE = 2.4;
/**
 * The pot is drawn in 3/4, so its front corner (y=1136 in the source) hangs
 * ~100px below the side corners (~1011 and ~1060). Resting the image's bottom
 * on the card left it balanced on that single front point. Sinking it by the
 * difference puts the card's edge through the base, so the back corners meet
 * the edge and the pot reads as standing on it.
 */
const POT_SEAT_RATIO = (1136 - 1035) / 1131;
/**
 * Corner radius as a share of the card's width, from Figma folks-v2 node
 * 325:12 (424px radius on a 2532px-wide frame). Kept as a ratio so the
 * corners stay proportional at any screen width.
 */
const CARD_RADIUS_RATIO = 424 / 2532;
/** The card holds the source image's proportions rather than stretching. */
const CARD_ASPECT = 2548 / 1569;

type Props = {
  total: number;
  received: number;
  /** Leftover carried through every month up to this one. */
  balance: number;
  month: { year: number; month: number };
  onShiftMonth: (delta: number) => void;
  canGoForward: boolean;
};

export function TotalSpendCard({ total, received, balance, month, onShiftMonth, canGoForward }: Props) {
  const { accent } = useAccent();
  const [pickerOpen, setPickerOpen] = useState(false);
  // Seeded from window width (the card spans it minus both gutters) so the
  // cat is sized correctly on the very first frame, then corrected from
  // real layout in case insets/orientation make that assumption wrong.
  const [cardWidth, setCardWidth] = useState(Dimensions.get('window').width - GUTTER * 2);

  // A non-finite width would propagate NaN into the cat's absolute
  // positioning, and NaN style values fail RN's bridge argument check.
  const safeCardWidth = Number.isFinite(cardWidth) && cardWidth > 0 ? cardWidth : 0;
  const cardRadius = safeCardWidth * CARD_RADIUS_RATIO;
  const artWidth = safeCardWidth * CAT_WIDTH_RATIO;
  const artHeight = artWidth / CAT_ART_ASPECT;
  // Distance from the top of the art down to the body's underside. Using it
  // as both the cat's offset and the card's top margin lands the body
  // exactly on the card's edge (tail carrying on down over the face), and
  // reserves the space above so the screen's padding reads as clear air.
  const aboveCard = artHeight * CAT_BODY_BOTTOM_RATIO;
  const plantHeight = artHeight * CAT_TORSO_RATIO * PLANT_SCALE;
  // The plant now stands taller than the cat, so the space reserved above the
  // card has to follow whichever is bigger or the taller one gets cut off.
  const headroom = Math.max(aboveCard, plantHeight);

  return (
    <View style={[styles.wrap, { marginTop: headroom }]}>
      <CatMascot
        artWidth={artWidth}
        left={CAT_LEFT_INSET}
        artTop={-aboveCard}
        onPress={() => setPickerOpen(true)}
      />
      {/* Where the title used to sit: resting on the card's top-right edge,
          mirroring the cat on the left. */}
      <Image
        source={require('../../assets/plant.png')}
        style={[
          styles.plant,
          {
            width: plantHeight * PLANT_ASPECT,
            height: plantHeight,
            top: -plantHeight * (1 - POT_SEAT_RATIO),
          },
        ]}
        resizeMode="contain"
      />
      <View
        style={[styles.card, { borderRadius: cardRadius }]}
        onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
      >
        <CardSurface radius={cardRadius} />
        <View style={styles.cardContent}>
          {/* Month is stepped from the card itself now, not buried in the
              cat's sheet. */}
          <View style={styles.monthRow}>
            <Pressable
              onPress={() => onShiftMonth(-1)}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
            >
              <Text style={[styles.monthArrow, { color: accent }]}>‹</Text>
            </Pressable>
            <Text style={styles.label}>{formatMonthLabel(month.year, month.month)}</Text>
            <Pressable
              onPress={() => canGoForward && onShiftMonth(1)}
              hitSlop={16}
              disabled={!canGoForward}
              accessibilityRole="button"
              accessibilityLabel="Next month"
            >
              <Text style={[styles.monthArrow, { color: canGoForward ? accent : base.borderOpaque }]}>›</Text>
            </Pressable>
          </View>

          <View style={styles.figures}>
            {received > 0 && (
              <Text style={styles.received}>
                +₹{received.toLocaleString('en-IN', { maximumFractionDigits: 0 })} received
              </Text>
            )}
            <Text style={[styles.amount, { color: accent }]}>
              -₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>

          {/* Three blocks under space-between split the leftover height into
              two equal gaps, so month-to-figures matches figures-to-balance. */}
          <Text style={styles.balance}>
            balance: {balance < 0 ? '-' : ''}₹{Math.abs(balance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
        </View>
      </View>
      <ColorPickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: GUTTER },
  plant: {
    position: 'absolute',
    // Inset by the corner radius, not the cat's inset: any closer to the
    // edge and the pot sits over the rounded corner, where the painted edge
    // curves ~6px away from the card's bounding box and leaves a gap.
    right: radius.card,
    zIndex: 10,
    elevation: 6,
  },
  figures: { alignItems: 'center' },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: sizing.scale600 },
  monthArrow: { ...typography.HeadingMedium, lineHeight: 30 },
  card: {
    backgroundColor: base.backgroundPrimary,
    // Height follows the artwork, so the card never stretches. The text is
    // then spread to the padding rather than given a fixed gap — the gap is
    // whatever the fixed height leaves over.
    aspectRatio: CARD_ASPECT,
    ...elevation.card,
  },
  // The padding sits here, not on the card: Yoga lays absolute children out
  // inside the parent's padding, so padding on the card inset the surface
  // artwork and cropped its edges away.
  cardContent: {
    flex: 1,
    paddingVertical: sizing.scale900,
    paddingHorizontal: sizing.scale800,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // The two lines flanking the total stay in Urbanist — they read as
  // captions for the figure, not as headings.
  label: { ...typography.LabelMedium, color: base.contentFaint },
  amount: { ...heading.XLarge },
  // Deliberately quiet next to the spend figure — money in is context, not
  // the headline.
  received: { ...typography.LabelSmall, color: base.positive, marginBottom: sizing.scale200 },
  balance: { ...typography.LabelSmall, color: base.negative },
});
