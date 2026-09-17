import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { base } from '../theme/colors';
import { sizing, heading } from '../theme/tokens';
import { useAccent } from '../theme/ThemeContext';
import { Category, CategoryTotal } from '../data/db';
import { CategoryRow } from './CategoryRow';
import { AddCategorySheet } from './AddCategorySheet';
import { UNCATEGORIZED_ID } from '../data/categories';

type Props = {
  categories: Category[];
  totals: Record<string, CategoryTotal>;
  onOpenCategory: (categoryId: string) => void;
  onCategoryCreated: (categoryId: string, label: string, iconKey: string | null) => void;
};

const EMPTY: CategoryTotal = { spent: 0, received: 0 };
const volume = (t: CategoryTotal | undefined) => (t ? Math.max(t.spent, 0) + t.received : 0);

export function CategoryList({ categories, totals, onOpenCategory, onCategoryCreated }: Props) {
  const { accent } = useAccent();
  const [addOpen, setAddOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const { visible, hidden, scale } = useMemo(() => {
    const untagged = totals[UNCATEGORIZED_ID];
    // Untagged money belongs to no real category, so without this synthetic
    // row the breakdown could never add up to the figures on the card. It
    // sorts in with the rest rather than always trailing them.
    const shown: Category[] = categories.filter((c) => !c.hidden);
    if (volume(untagged) > 0) {
      shown.push({ id: UNCATEGORIZED_ID, label: 'untagged', colorHex: base.contentTertiary, createdAt: 0 });
    }
    // Highest first; sort is stable, so ties keep their order between renders.
    const byVolume = (a: Category, b: Category) => volume(totals[b.id]) - volume(totals[a.id]);
    const sortedShown = shown.sort(byVolume);
    const sortedHidden = categories.filter((c) => c.hidden).sort(byVolume);
    const max = Math.max(...sortedShown.map((c) => volume(totals[c.id])), 0);
    return { visible: sortedShown, hidden: sortedHidden, scale: max };
  }, [categories, totals]);

  const renderRow = (cat: Category) => (
    <CategoryRow
      key={cat.id}
      category={cat}
      total={totals[cat.id] ?? EMPTY}
      scale={scale}
      onPress={() => onOpenCategory(cat.id)}
    />
  );

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: accent }]}>by category</Text>
        <Pressable onPress={() => setAddOpen(true)} hitSlop={8}>
          <Text style={styles.headerLink}>+ add</Text>
        </Pressable>
      </View>

      {visible.map(renderRow)}

      {hidden.length > 0 && (
        <Pressable onPress={() => setShowHidden((v) => !v)} hitSlop={8} style={styles.hiddenToggle}>
          <Text style={styles.headerLink}>
            {showHidden ? 'hide hidden' : `show hidden (${hidden.length})`}
          </Text>
        </Pressable>
      )}
      {showHidden && hidden.map(renderRow)}

      <AddCategorySheet
        visible={addOpen}
        existingCategories={categories}
        onClose={() => setAddOpen(false)}
        onCreate={onCategoryCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: sizing.scale900 },
  // scale400 (10) + 6 = 16, matching the untagged section's heading gap.
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sizing.scale600,
  },
  sectionTitle: { ...heading.Small },
  headerLink: { ...heading.Body, color: base.contentFaint },
  hiddenToggle: { alignSelf: 'center', paddingVertical: sizing.scale500 },
});
