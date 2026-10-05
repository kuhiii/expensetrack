import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { GULLAK_LAYOUT } from './gullakLayout';
import { W, pixelText } from './pixel';

const ROOM = require('../../assets/gullak/main-room.png');
const METALS = ['steel', 'bimetal', 'gold'] as const;
const FACE = {
  steel: require('../../assets/gullak/coin-steel.png'),
  bimetal: require('../../assets/gullak/coin-bimetal.png'),
  gold: require('../../assets/gullak/coin-gold.png'),
};
const FLAT = {
  steel: require('../../assets/gullak/coin-flat-steel.png'),
  bimetal: require('../../assets/gullak/coin-flat-bimetal.png'),
  gold: require('../../assets/gullak/coin-flat-gold.png'),
};
const L = GULLAK_LAYOUT.main;
const MAX_COINS = L.coinLand.length;

type Props = {
  /** Spends waiting to be sorted: one coin each, up to MAX_COINS. */
  coins: number;
  /** Bumped whenever the app comes to the foreground, so the coins drop again. */
  dropKey: number;
  onMunim: () => void;
  onStairs: () => void;
};

/**
 * One coin dropping from above into the pool of light in front of munimji,
 * flipping as it falls, then lying flat where it landed.
 */
function FallingCoin({ index, dropKey }: { index: number; dropKey: number }) {
  const metal = METALS[index % METALS.length];
  const land = L.coinLand[index];
  const t = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    t.value = 0;
    spin.value = 0;
    const delay = index * 220;
    t.value = withDelay(delay, withTiming(1, { duration: 700, easing: Easing.bezier(0.5, 0, 0.75, 0.4) }));
    spin.value = withDelay(delay, withRepeat(withTiming(1, { duration: 160 }), 4, true));
  }, [dropKey, index, t, spin]);

  const faceStyle = useAnimatedStyle(() => ({
    opacity: t.value < 1 ? 1 : 0,
    transform: [
      { translateY: (land.y - 20 + 40) * t.value - 40 },
      { scaleX: 1 - spin.value * 0.8 },
    ],
  }));
  const flatStyle = useAnimatedStyle(() => ({ opacity: t.value >= 1 ? 1 : 0 }));

  return (
    <>
      <Animated.Image source={FACE[metal]} style={[styles.coinFace, { left: land.x - 18, top: 0 }, faceStyle]} fadeDuration={0} />
      <Animated.Image source={FLAT[metal]} style={[styles.coinFlat, { left: land.x - 14, top: land.y - 8 }, flatStyle]} fadeDuration={0} />
    </>
  );
}

/** Level 1: the hollow of the gullak, munimji at his peti, and the stairs door. */
export function MainRoom({ coins, dropKey, onMunim, onStairs }: Props) {
  const n = Math.min(coins, MAX_COINS);
  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={ROOM} style={styles.room} fadeDuration={0} />
      {Array.from({ length: n }, (_, i) => (
        <FallingCoin key={i} index={i} dropKey={dropKey} />
      ))}
      <Pressable
        style={[styles.hit, { left: L.munim.x, top: L.munim.y, width: L.munim.w, height: L.munim.h }]}
        onPress={onMunim}
        accessibilityRole="button"
        accessibilityLabel="Munimji: settings"
      />
      <Pressable
        style={[styles.hit, { left: L.door.x, top: L.door.y, width: L.door.w, height: L.door.h }]}
        onPress={onStairs}
        accessibilityRole="button"
        accessibilityLabel="Stairs down to categories"
      />
      <Text style={[styles.doorLabel, { left: L.doorLabel.x - 50, top: L.doorLabel.y - 14 }]}>stairs ↓</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  room: { position: 'absolute', left: 0, top: 0, width: 360, height: 780 },
  hit: { position: 'absolute' },
  coinFace: { position: 'absolute', width: 40, height: 40 },
  coinFlat: { position: 'absolute', width: 28, height: 16 },
  doorLabel: { position: 'absolute', width: 100, textAlign: 'center', ...pixelText(4), color: W.clayLabel },
});
