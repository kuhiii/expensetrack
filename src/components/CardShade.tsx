import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

/**
 * The top card's inner shading, reusable over any fill colour.
 *
 * The card artwork itself is opaque white, so it can't be layered over a
 * tinted card without wiping the tint. This asset is that same artwork with
 * its shading extracted into an alpha channel over black — laid on top, it
 * darkens whatever is beneath it by the same amount, so a pastel card picks
 * up the identical treatment. Peaks at ~13% alpha.
 *
 * The overlay carries no corners of its own — the source's rounded-corner
 * transparency is filled outward to the full rectangle. Its corners used to
 * be cut at the top card's radius, which left unshaded wedges on any card
 * with a different one. Now the card's own borderRadius defines the shape.
 *
 * The Image is wrapped rather than absolutely filled itself: an Image with
 * only inset offsets falls back to its intrinsic pixel size.
 */
export function CardShade({ radius }: { radius: number }) {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { borderRadius: radius, overflow: 'hidden' }]}
    >
      <Image
        source={require('../../assets/card-shade.png')}
        style={styles.image}
        resizeMode="stretch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
});
