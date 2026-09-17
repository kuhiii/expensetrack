import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { base } from '../theme/colors';
import { sizing, radius } from '../theme/tokens';

/**
 * The app's one bottom sheet: a dimmed backdrop that fades, and a panel that
 * rises from the bottom edge.
 *
 * Modal's own `animationType="slide"` moves the *whole* modal, backdrop
 * included — so the dim swept up from the bottom with the panel instead of
 * settling over the page. Here the two are animated separately: the backdrop
 * only ever changes opacity, and only the panel travels.
 *
 * `mounted` trails `visible` by one animation so the exit has something to
 * play on; unmounting the Modal the instant `visible` flips would cut it.
 */

const DURATION = 240;

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Extra style for the panel — a maxHeight, mostly. */
  sheetStyle?: StyleProp<ViewStyle>;
};

export function BottomSheet({ visible, onClose, children, sheetStyle }: Props) {
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), DURATION);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <Modal visible={mounted} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        {visible && (
          <>
            <Animated.View
              style={styles.backdrop}
              entering={FadeIn.duration(DURATION)}
              exiting={FadeOut.duration(DURATION)}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>
            <Animated.View
              style={[styles.sheet, sheetStyle]}
              entering={SlideInDown.duration(DURATION)}
              exiting={SlideOutDown.duration(DURATION)}
            >
              <View style={styles.grabber} />
              {children}
            </Animated.View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  // Full-screen, not just the area above the panel: the panel's rounded top
  // corners are see-through, and an undimmed page behind them read as a
  // square frame around the sheet.
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.32)' },
  sheet: {
    backgroundColor: base.backgroundPrimary,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    // Android needs the clip to actually round the top corners here; the
    // background alone rendered square.
    overflow: 'hidden',
    paddingHorizontal: sizing.scale800,
    paddingTop: sizing.scale500,
    paddingBottom: sizing.scale1200,
    // No elevation: Android derives the shadow outline from the background
    // shape, and with only the top corners rounded it falls back to the full
    // rectangle — drawing a square-cornered frame behind the rounded sheet.
    // The dimmed backdrop already separates the sheet from the page.
  },
  grabber: {
    alignSelf: 'center',
    width: sizing.scale1000,
    height: 4,
    borderRadius: radius.radius200,
    backgroundColor: base.borderOpaque,
    marginBottom: sizing.scale600,
  },
});
