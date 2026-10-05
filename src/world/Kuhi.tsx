import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { KUHI_IMAGES } from './kuhiImages';
import { PixelPanel, W, pixelText } from './pixel';
import { Step, spriteBox } from './walk';

type Props = {
  step: Step;
  /** False while she's walking: no turning round mid-stride. */
  interactive: boolean;
  /** Which side of her the speech bubble sits on. */
  bubbleSide: 'right' | 'left';
};

/**
 * You, drawn wherever the current walk step puts you. Standing still, tap her
 * and she turns her head back and smiles, and a bubble explains how to get
 * around; it fades on its own.
 */
export function Kuhi({ step, interactive, bubbleSide }: Props) {
  const [turned, setTurned] = useState(false);

  useEffect(() => {
    if (!turned) return;
    const t = setTimeout(() => setTurned(false), 3500);
    return () => clearTimeout(t);
  }, [turned]);
  useEffect(() => {
    if (!interactive) setTurned(false);
  }, [interactive]);

  const { left, top, size } = spriteBox(step);
  const frame = turned && step.frame === 'back-5' ? 'turn-5' : step.frame;
  const img = (
    <Image
      source={KUHI_IMAGES[frame]}
      fadeDuration={0}
      style={{
        position: 'absolute',
        left: step.clip ? left - step.clip.x : left,
        top: step.clip ? top - step.clip.y : top,
        width: size,
        height: size,
        // Always an array: going from a transform back to none crashes RN 0.74's native diff.
        transform: [{ scaleX: step.flip ? -1 : 1 }],
      }}
    />
  );

  return (
    <>
      {step.clip ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: step.clip.x, top: step.clip.y, width: step.clip.w, height: step.clip.h, overflow: 'hidden' }}
        >
          {img}
        </View>
      ) : (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {img}
        </View>
      )}
      {interactive && (
        // Only her body is the tap target, not the empty corners of the sprite.
        <Pressable
          onPress={() => setTurned((v) => !v)}
          style={{ position: 'absolute', left: left + size * 0.18, top: top + size * 0.05, width: size * 0.66, height: size * 0.95 }}
          accessibilityRole="button"
          accessibilityLabel="You"
        />
      )}
      {turned && (
        <View
          style={[
            styles.bubbleWrap,
            bubbleSide === 'right' ? { left: left + size * 0.78 } : { left: left - 170 },
            { top: top + 56 },
          ]}
          pointerEvents="none"
        >
          <PixelPanel style={styles.bubble} b={3} shadow={3}>
            <Text style={styles.bubbleText}>scroll</Text>
            <View style={styles.keys}>
              {['↑', '↓', '←', '→'].map((a) => (
                <View key={a} style={styles.keyWrap}>
                  <PixelPanel fill="#C9B8A8" b={2} style={styles.keyBase} />
                  <PixelPanel fill="#FFFFFF" b={2} style={styles.keyTop}>
                    <Text style={styles.keyText}>{a}</Text>
                  </PixelPanel>
                </View>
              ))}
            </View>
            <Text style={styles.bubbleText}>to navigate</Text>
          </PixelPanel>
          <View style={[styles.tail, bubbleSide === 'right' ? styles.tailLeft : styles.tailRight]} />
        </View>
      )}
    </>
  );
}

/** Every walk frame, mounted once off-screen so the first steps don't blink while they decode. */
export function KuhiPreload() {
  return (
    <View style={styles.preload} pointerEvents="none">
      {Object.keys(KUHI_IMAGES).map((k) => (
        <Image key={k} source={KUHI_IMAGES[k]} style={styles.preloadImg} fadeDuration={0} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: { position: 'absolute', width: 152 },
  bubble: { height: 104, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  bubbleText: { ...pixelText(5), color: W.ink },
  keys: { flexDirection: 'row', gap: 5 },
  keyWrap: { width: 28, height: 29 },
  keyBase: { position: 'absolute', left: 0, top: 3, width: 28, height: 26 },
  keyTop: { position: 'absolute', left: 0, top: 0, width: 28, height: 25, alignItems: 'center', justifyContent: 'center' },
  keyText: { ...pixelText(5), color: W.ink },
  tail: { position: 'absolute', top: 58, width: 12, height: 12, backgroundColor: W.outline, transform: [{ rotate: '45deg' }] },
  tailLeft: { left: -5 },
  tailRight: { right: -5 },
  preload: { position: 'absolute', left: -10, top: -10, width: 1, height: 1, opacity: 0.01, overflow: 'hidden' },
  preloadImg: { width: 1, height: 1 },
});
