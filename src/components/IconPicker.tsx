import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { base } from '../theme/colors';
import { radius, sizing } from '../theme/tokens';
import { useAccent } from '../theme/ThemeContext';
import { CATEGORY_ICONS, CATEGORY_ICON_KEYS } from '../data/categories';

type Props = {
  selected: string | null;
  onSelect: (iconKey: string) => void;
};

const TILE = 56;

/** A horizontal strip of every category icon, used when adding or editing. */
export function IconPicker({ selected, onSelect }: Props) {
  const { accent } = useAccent();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {CATEGORY_ICON_KEYS.map((key) => (
        <Pressable
          key={key}
          onPress={() => onSelect(key)}
          style={[styles.tile, selected === key && { borderColor: accent }]}
          accessibilityRole="button"
          accessibilityLabel={`Use ${key} icon`}
        >
          <Image source={CATEGORY_ICONS[key]} style={styles.icon} resizeMode="contain" />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: sizing.scale300, paddingVertical: sizing.scale300 },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.radius300,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: base.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 40, height: 40 },
});
