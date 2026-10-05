import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LEAF_IMAGES } from './leafImages';
import { PixelPanel, W, pixelText } from './pixel';

type Props = { label: string; top: number; onPress: () => void };

/**
 * A little hanging signboard pinned to the right edge of the screen, at the
 * height of the room's right-hand door — so you know the door is there even
 * when it's scrolled out of view. Its arrow nudges toward the door.
 */
export function DoorSign({ label, top, onPress }: Props) {
  const nudge = useSharedValue(0);
  useEffect(() => {
    nudge.value = withRepeat(
      withSequence(withTiming(4, { duration: 420, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 420, easing: Easing.inOut(Easing.quad) })),
      -1
    );
  }, [nudge]);
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: nudge.value }] }));

  return (
    <Pressable style={[styles.wrap, { top }]} onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Go to ${label}`}>
      {/* the strings it hangs from */}
      <View style={[styles.string, { left: 18 }]} />
      <View style={[styles.string, { right: 18 }]} />
      <PixelPanel fill={W.paper} border="#7A4A32" b={3} shadow={3} style={styles.board}>
        <Image source={LEAF_IMAGES['R-4-green']} style={styles.leaf} fadeDuration={0} />
        <Text style={styles.text}>{label}</Text>
        <Animated.Text style={[styles.arrow, arrowStyle]}>›</Animated.Text>
      </PixelPanel>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 6, alignItems: 'flex-end' },
  string: { position: 'absolute', top: -26, width: 2, height: 28, backgroundColor: '#7A4A32' },
  board: { flexDirection: 'row', alignItems: 'center', paddingLeft: 6, paddingRight: 10, height: 40 },
  leaf: { width: 38, height: 30, marginRight: -4, marginTop: -8 },
  text: { ...pixelText(5), color: W.ink },
  arrow: { ...pixelText(6), color: W.greenSoft, marginLeft: 6 },
});
