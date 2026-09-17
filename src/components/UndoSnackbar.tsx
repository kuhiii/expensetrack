import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { base } from '../theme/colors';
import { sizing, radius, typography, elevation } from '../theme/tokens';
import { useAccent } from '../theme/ThemeContext';

type Props = {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
};

export function UndoSnackbar({ visible, message, onUndo, onDismiss, durationMs = 4000 }: Props) {
  const { accent } = useAccent();

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [visible, durationMs, onDismiss]);

  if (!visible) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.message} numberOfLines={1}>{message}</Text>
      <Pressable onPress={onUndo} hitSlop={8}>
        <Text style={[styles.undo, { color: accent }]}>Undo</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: sizing.scale600,
    right: sizing.scale600,
    bottom: sizing.scale900,
    backgroundColor: base.backgroundInverseSecondary,
    borderRadius: radius.radius300,
    paddingVertical: sizing.scale500,
    paddingHorizontal: sizing.scale600,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...elevation.shadow600,
  },
  message: { ...typography.ParagraphSmall, color: base.contentInversePrimary, flex: 1 },
  undo: { ...typography.LabelMedium },
});
