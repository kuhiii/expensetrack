import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ScrollView } from 'react-native';
import { base } from '../theme/colors';
import { sizing, radius, typography } from '../theme/tokens';
import { Category } from '../data/db';
import { iconForCategory } from '../data/categories';
import { AddCategorySheet } from './AddCategorySheet';
import { useAccent } from '../theme/ThemeContext';

type Props = {
  categories: Category[];
  onPick: (categoryId: string) => void;
  onCategoryCreated: (categoryId: string, label: string, iconKey: string | null) => void;
  /** Marks the chosen chip when the caller confirms separately. */
  selectedId?: string | null;
};


export function CategoryPickerRow({ categories, onPick, onCategoryCreated, selectedId }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const { accent } = useAccent();

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {categories.filter((c) => !c.hidden).map((cat) => (
          <Pressable
            key={cat.id}
            style={[
              styles.chip,
              selectedId === cat.id && { backgroundColor: accent + '33', borderColor: accent },
            ]}
            onPress={() => onPick(cat.id)}
          >
            {iconForCategory(cat) ? (
              <Image source={iconForCategory(cat)} style={styles.chipIcon} resizeMode="contain" />
            ) : (
              <View style={[styles.chipDot, { backgroundColor: cat.colorHex }]} />
            )}
            <Text style={styles.chipLabel} numberOfLines={1}>{cat.label}</Text>
          </Pressable>
        ))}
        <Pressable style={[styles.chip, styles.addChip]} onPress={() => setAddOpen(true)}>
          <Text style={styles.addChipText}>+</Text>
        </Pressable>
      </ScrollView>

      <AddCategorySheet
        visible={addOpen}
        existingCategories={categories}
        onClose={() => setAddOpen(false)}
        onCreate={onCategoryCreated}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { gap: sizing.scale400, paddingVertical: sizing.scale400 },
  chip: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: base.backgroundSecondary,
    borderRadius: radius.radius300,
    paddingHorizontal: sizing.scale500,
    paddingVertical: sizing.scale400,
    minWidth: 64,
    gap: sizing.scale100,
  },
  chipIcon: { width: 40, height: 40 },
  chipDot: { width: 20, height: 20, borderRadius: 10 },
  chipLabel: { ...typography.LabelXSmall, color: base.contentPrimary, maxWidth: 64 },
  addChip: { backgroundColor: base.backgroundTertiary, justifyContent: 'center' },
  addChipText: { ...typography.HeadingSmall, color: base.contentSecondary },
});
