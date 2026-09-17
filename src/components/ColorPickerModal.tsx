import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet, FlatList } from 'react-native';
import { accentSwatches, base } from '../theme/colors';
import { sizing, radius, typography, heading } from '../theme/tokens';
import { useAccent } from '../theme/ThemeContext';
import { BottomSheet } from './BottomSheet';
import {
  APP_ICONS,
  AppIconName,
  DEFAULT_APP_ICON,
  appIconSwitchingAvailable,
  getAppIcon,
  setAppIcon,
} from '../services/appIcon';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/** The sheet the cat opens: accent colour and app icon. Month lives on the card. */
export function ColorPickerModal({ visible, onClose }: Props) {
  const { accent, setAccent } = useAccent();
  const [icon, setIcon] = useState<AppIconName>(DEFAULT_APP_ICON);

  // Read on open rather than on mount: the launcher alias can also be changed
  // from outside the app, and this is the cheapest place to resync.
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    getAppIcon().then((current) => {
      if (alive) setIcon(current);
    });
    return () => {
      alive = false;
    };
  }, [visible]);

  const handlePickIcon = (name: AppIconName) => {
    if (name === icon) return;
    // Optimistic: swapping the alias makes the launcher redraw, and waiting
    // on that round trip left the selection ring lagging the tap.
    setIcon(name);
    setAppIcon(name).catch(() => setIcon(icon));
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
        <Text style={styles.title}>accent color</Text>

        <FlatList
          data={accentSwatches}
          numColumns={4}
          keyExtractor={(hex) => hex}
          contentContainerStyle={{ gap: sizing.scale600 }}
          // space-between, not a fixed gap: four fixed-width swatches left
          // ~40px of slack piling up on the right-hand edge.
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={({ item: hex }) => (
            <Pressable
              onPress={() => setAccent(hex)}
              style={[
                styles.swatch,
                { backgroundColor: hex },
                accent === hex && styles.swatchSelected,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Set accent color ${hex}`}
            />
          )}
        />

        {appIconSwitchingAvailable && (
          <>
            <Text style={[styles.title, styles.iconTitle]}>app icon</Text>
            <View style={styles.iconRow}>
              {APP_ICONS.map((option) => (
                <Pressable
                  key={option.name}
                  onPress={() => handlePickIcon(option.name)}
                  style={styles.iconOption}
                  accessibilityRole="button"
                  accessibilityLabel={`Set app icon to ${option.label}`}
                >
                  <Image
                    source={option.preview}
                    style={[styles.iconPreview, icon === option.name && styles.iconSelected]}
                  />
                  <Text style={styles.iconLabel}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Pressable style={[styles.doneButton, { backgroundColor: accent }]} onPress={onClose}>
          <Text style={styles.doneText}>done</Text>
        </Pressable>
    </BottomSheet>
  );
}

const SWATCH_SIZE = 56;
const ICON_SIZE = 72;

const styles = StyleSheet.create({
  title: { ...heading.Medium, color: base.contentFaint, marginBottom: sizing.scale500 },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: base.contentPrimary,
  },
  iconTitle: { marginTop: sizing.scale900 },
  iconRow: { flexDirection: 'row', gap: sizing.scale600 },
  iconOption: { alignItems: 'center', gap: sizing.scale300 },
  iconPreview: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    // Android's own launcher squircle is close enough to this that the
    // preview reads as the icon rather than as a photo of it.
    borderRadius: ICON_SIZE * 0.28,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  iconSelected: { borderColor: base.contentPrimary },
  iconLabel: { ...typography.LabelXSmall, color: base.contentFaint },
  doneButton: {
    marginTop: sizing.scale900,
    borderRadius: radius.radius300,
    paddingVertical: sizing.scale500,
    alignItems: 'center',
  },
  doneText: { ...heading.Body, color: base.primaryB },
});
