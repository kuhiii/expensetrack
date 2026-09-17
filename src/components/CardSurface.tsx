import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

/**
 * The card's surface, taken straight from the Figma render (folks-v2 node
 * 325:12) rather than approximated in code — the design's three inset
 * shadows have no React Native equivalent.
 *
 * The card is locked to the image's own aspect ratio, so stretching can't
 * distort it.
 *
 * The Image sits inside an absolutely-filled View rather than being absolutely
 * filled itself: an Image with only inset offsets and no explicit dimensions
 * falls back to its intrinsic pixel size (here 2548×1569), which spilled the
 * artwork way outside the card.
 */
export function CardSurface({ radius }: { radius: number }) {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { borderRadius: radius, overflow: 'hidden' }]}
    >
      <Image
        source={require('../../assets/card-surface.png')}
        style={styles.image}
        resizeMode="stretch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
});
