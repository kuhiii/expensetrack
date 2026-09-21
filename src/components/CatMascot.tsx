import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

// cat.png is a 1254x1254 canvas with a lot of transparent padding around
// the actual art (measured alpha bounding box below). Positioning against
// the canvas would leave invisible slack above and beside the cat, so the
// visible art is sized and placed directly and the padding is offset out.
const CANVAS = 1254;
const ART = { left: 83, top: 181, width: 1102, height: 959 };

/** width / height of the *visible* cat, for callers sizing it off the card. */
export const CAT_ART_ASPECT = ART.width / ART.height;

// Where the cat actually rests on a surface. Measured per-column over the
// art (excluding the tail, which hangs to y=1139): the body's flat
// underside is at y=630 while the paws/legs reach y=699. Aligning to the
// paws left the belly visibly floating, so this uses the underside — the
// legs then tuck a few px over the surface, which is what "sitting on it"
// looks like.
export const CAT_BODY_BOTTOM_RATIO = (630 - ART.top) / ART.height;

/**
 * Height of the cat's torso — the tan block alone, measured from the top of
 * its back (y=395) to its underside (y=630), so decorations elsewhere can be
 * matched to it rather than to the full art (which includes ears and tail).
 */
export const CAT_TORSO_RATIO = (630 - 395) / ART.height;

type Props = {
  /** Rendered width of the visible cat art. */
  artWidth: number;
  /** Where the art's left edge sits, relative to the parent. */
  left: number;
  /** Where the art's top edge sits, relative to the parent (negative = above). */
  artTop: number;
  onPress: () => void;
};

export function CatMascot({ artWidth, left, artTop, onPress }: Props) {
  const canvas = artWidth * (CANVAS / ART.width);
  const artHeight = artWidth / CAT_ART_ASPECT;

  return (
    // box-none, with the tap target sized to the cat rather than to the
    // canvas: the canvas is a big transparent square whose lower half sits
    // over the card, so as one Pressable it swallowed taps meant for the
    // controls underneath — the month arrows opened the cat's sheet. The
    // target is also cut off at the body's underside, leaving the tail that
    // hangs over the card non-interactive for the same reason.
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          width: canvas,
          height: canvas,
          left: left - (ART.left / CANVAS) * canvas,
          top: artTop - (ART.top / CANVAS) * canvas,
        },
      ]}
    >
      {/* The image is wrapped in a pointerEvents="none" view: box-none on
          the container exempts only the container itself and leaves its
          children as touch targets, so this image — which covers the whole
          canvas — kept swallowing taps meant for the month arrows beneath. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image source={require('../../assets/cat.png')} style={styles.cat} resizeMode="contain" />
      </View>
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Change accent color"
        style={{
          position: 'absolute',
          left: (ART.left / CANVAS) * canvas,
          top: (ART.top / CANVAS) * canvas,
          width: artWidth,
          height: artHeight * CAT_BODY_BOTTOM_RATIO,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // elevation, not just zIndex: on Android elevation decides paint order, so
  // this has to out-rank the card's own elevation to sit on top of it.
  wrap: { position: 'absolute', zIndex: 10, elevation: 6 },
  cat: { width: '100%', height: '100%' },
});
