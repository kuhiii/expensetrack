import React, { useState } from 'react';
import { Text, Pressable, Image, TextInput, StyleSheet, FlatList } from 'react-native';
import { base } from '../theme/colors';
import { sizing, radius, typography, heading } from '../theme/tokens';
import { useAccent } from '../theme/ThemeContext';
import {
  CATEGORY_ICONS,
  CategoryPreset,
  DEFAULT_ICON_KEY,
  nextAvailablePresets,
} from '../data/categories';
import { Category } from '../data/db';
import { BottomSheet } from './BottomSheet';
import { IconPicker } from './IconPicker';

type Props = {
  visible: boolean;
  existingCategories: Category[];
  onClose: () => void;
  onCreate: (categoryId: string, label: string, iconKey: string | null) => void;
};

function slugify(label: string) {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'category';
}

/** An id no existing category uses — two labels can slugify to the same id. */
function uniqueId(label: string, taken: Set<string>) {
  const base_ = slugify(label);
  let id = base_;
  for (let n = 2; taken.has(id); n++) id = `${base_}-${n}`;
  return id;
}

export function AddCategorySheet({ visible, existingCategories, onClose, onCreate }: Props) {
  const { accent } = useAccent();
  const [customName, setCustomName] = useState('');
  const [iconKey, setIconKey] = useState<string>(DEFAULT_ICON_KEY);
  const presets = nextAvailablePresets(existingCategories.map((c) => c.id));

  const trimmed = customName.trim();
  const clash = existingCategories.find((c) => c.label.toLowerCase() === trimmed.toLowerCase());
  const canAdd = trimmed.length > 0 && !clash;

  const close = () => {
    setCustomName('');
    setIconKey(DEFAULT_ICON_KEY);
    onClose();
  };

  const handlePresetTap = (preset: CategoryPreset) => {
    onCreate(preset.id, preset.label, preset.iconKey);
    close();
  };

  const handleCustomSubmit = () => {
    if (!canAdd) return;
    const id = uniqueId(trimmed, new Set(existingCategories.map((c) => c.id)));
    onCreate(id, trimmed, iconKey);
    close();
  };

  return (
    <BottomSheet visible={visible} onClose={close} sheetStyle={styles.sheet}>
      <Text style={styles.title}>add a category</Text>

      <FlatList
        data={presets}
        keyExtractor={(p) => p.id}
        numColumns={3}
        style={styles.grid}
        contentContainerStyle={{ gap: sizing.scale100 }}
        columnWrapperStyle={{ gap: sizing.scale100 }}
        renderItem={({ item }) => (
          <Pressable style={styles.presetTile} onPress={() => handlePresetTap(item)}>
            <Image source={CATEGORY_ICONS[item.iconKey]} style={styles.presetIcon} resizeMode="contain" />
            <Text style={styles.presetLabel} numberOfLines={2}>{item.label}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.hint}>every preset is already added.</Text>
        }
      />

      <Text style={styles.subheading}>or make your own</Text>
      <TextInput
        value={customName}
        onChangeText={setCustomName}
        placeholder="category name"
        placeholderTextColor={base.contentTertiary}
        style={styles.input}
        onSubmitEditing={handleCustomSubmit}
        returnKeyType="done"
      />
      {clash && (
        <Text style={styles.error}>
          {clash.hidden ? `"${clash.label}" exists but is hidden — unhide it from the list.` : `"${clash.label}" already exists.`}
        </Text>
      )}
      <IconPicker selected={iconKey} onSelect={setIconKey} />
      <Pressable
        style={[styles.addButton, { backgroundColor: canAdd ? accent : base.borderOpaque }]}
        onPress={handleCustomSubmit}
        disabled={!canAdd}
      >
        <Text style={styles.addButtonText}>add</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // Only the height cap — the rest of the panel's chrome is BottomSheet's.
  sheet: { maxHeight: '90%' },
  title: { ...heading.Medium, color: base.contentFaint, marginBottom: sizing.scale600 },
  grid: { flexGrow: 0, maxHeight: 260 },
  hint: { ...typography.ParagraphSmall, color: base.contentSecondary },
  subheading: {
    ...heading.Small,
    color: base.contentFaint,
    marginTop: sizing.scale800,
    marginBottom: sizing.scale300,
  },
  presetTile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: base.backgroundSecondary,
    borderRadius: radius.radius300,
    paddingVertical: sizing.scale600,
    // Horizontal padding so a long label wraps inside the tile instead of
    // running up against its edges.
    paddingHorizontal: sizing.scale400,
    gap: sizing.scale200,
  },
  presetIcon: { width: 40, height: 40 },
  presetLabel: { ...typography.LabelXSmall, color: base.contentPrimary, textAlign: 'center' },
  input: {
    backgroundColor: base.backgroundSecondary,
    borderRadius: radius.radius300,
    paddingHorizontal: sizing.scale600,
    paddingVertical: sizing.scale500,
    ...typography.ParagraphMedium,
    color: base.contentPrimary,
  },
  error: { ...typography.ParagraphXSmall, color: base.negative, marginTop: sizing.scale200 },
  addButton: {
    marginTop: sizing.scale500,
    borderRadius: radius.radius300,
    paddingVertical: sizing.scale500,
    alignItems: 'center',
  },
  addButtonText: { ...heading.Body, color: base.primaryB },
});
