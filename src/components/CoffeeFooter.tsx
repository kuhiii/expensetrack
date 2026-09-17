import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { coffee } from '../theme/colors';
import { sizing, heading } from '../theme/tokens';

/**
 * A shallow band of coffee closing out the page, with the credit reading as
 * if it were traced on the surface.
 *
 * The ripples are layered views rather than an image or SVG — this project
 * has no svg dependency, and a texture built from very wide, heavily rounded
 * ellipses at low opacity reads as liquid without shipping an asset. Each
 * band is rotated a little so the crests don't line up into visible stripes.
 */

const RIPPLES = [
  { top: -26, left: -40, width: '70%', height: 70, rotate: '-4deg', color: coffee.foam },
  { top: 6, left: '32%', width: '85%', height: 84, rotate: '3deg', color: coffee.sheen },
  { top: 34, left: -70, width: '80%', height: 66, rotate: '-2deg', color: coffee.depth },
  { top: 52, left: '18%', width: '70%', height: 60, rotate: '5deg', color: coffee.foam },
] as const;

/**
 * Cubes sit half-submerged: the band clips its own ripples, so these are
 * siblings of it rather than children — that's what lets them break above
 * the surface instead of being cut off at it.
 */
const ICE = [
  { left: '7%', top: -13, size: 30, rotate: '-12deg' },
  { left: '23%', top: -7, size: 21, rotate: '9deg' },
  { left: '69%', top: -15, size: 26, rotate: '14deg' },
  { left: '85%', top: -6, size: 19, rotate: '-7deg' },
] as const;

export function CoffeeFooter() {
  return (
    <View style={styles.wrap}>
      <View style={styles.footer}>
        {RIPPLES.map((r, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={[
              styles.ripple,
              {
                top: r.top,
                left: r.left,
                width: r.width,
                height: r.height,
                backgroundColor: r.color,
                transform: [{ rotate: r.rotate }],
              },
            ]}
          />
        ))}
        <Text style={styles.text}>made with ❤️ by kuhi</Text>
      </View>

      {ICE.map((c, i) => (
        <View
          key={`ice-${i}`}
          pointerEvents="none"
          style={[
            styles.ice,
            {
              left: c.left,
              top: c.top,
              width: c.size,
              height: c.size,
              transform: [{ rotate: c.rotate }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Holds the band and the ice; no clipping here, so cubes can rise above it.
  // Same gap the category section leaves below the total card.
  wrap: { marginTop: sizing.scale900 },
  footer: {
    height: 96,
    backgroundColor: coffee.liquid,
    alignItems: 'center',
    justifyContent: 'center',
    // Keeps the ripples inside the band.
    overflow: 'hidden',
  },
  ice: {
    position: 'absolute',
    borderRadius: 7,
    backgroundColor: coffee.ice,
    borderWidth: 1,
    borderColor: coffee.iceEdge,
  },
  ripple: {
    position: 'absolute',
    // Half the height, so each band is a full ellipse rather than a pill.
    borderRadius: 999,
  },
  text: {
    ...heading.Body,
    color: coffee.crema,
    // Sits slightly proud of the liquid, the way a light script would.
    textShadowColor: coffee.depth,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
