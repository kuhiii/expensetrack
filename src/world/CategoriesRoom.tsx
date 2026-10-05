import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { GULLAK_LAYOUT } from './gullakLayout';
import { POT_IMAGES, CUSTOM_POT_COUNT } from './potImages';
import { PixelPanel, W, pixelText, rupees } from './pixel';
import { Category, CategoryTotal } from '../data/db';
import { UNCATEGORIZED_ID } from '../data/categories';
import { AddCategorySheet } from '../components/AddCategorySheet';

const LEFT = require('../../assets/gullak/cat-left.png');
const MID = require('../../assets/gullak/cat-mid.png');
const RIGHT = require('../../assets/gullak/cat-right.png');
const NICHE = require('../../assets/gullak/niche.png');
const PLAIN_POT = require('../../assets/gullak/pot-plain.png');

const L = GULLAK_LAYOUT.categories;
const POT = GULLAK_LAYOUT.pot;
const NI = GULLAK_LAYOUT.niche;
const MIN_COLS = 3;

const volume = (t: CategoryTotal | undefined) => (t ? Math.max(t.spent, 0) + t.received : 0);

/** Which painted pot a category gets: its preset's, or a pastel one picked from its id. */
function potFor(id: string, fill: number) {
  if (POT_IMAGES[`${id}-${fill}`]) return POT_IMAGES[`${id}-${fill}`];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return POT_IMAGES[`custom${Math.abs(h) % CUSTOM_POT_COUNT}-${fill}`];
}

type Item =
  | { kind: 'cat'; category: Category; total: CategoryTotal }
  | { kind: 'more'; hiddenCount: number; open: boolean }
  | { kind: 'add' };

type Props = {
  categories: Category[];
  totals: Record<string, CategoryTotal>;
  onOpenCategory: (categoryId: string) => void;
  onCategoryCreated: (categoryId: string, label: string, iconKey: string | null) => void;
  onUp: () => void;
  onSavings: () => void;
  /** The camera's position along the wall (dp); the screen owns the swiping. */
  camX: SharedValue<number>;
  onWidth: (width: number) => void;
};

/**
 * Level 2, the categories room: a wall of niches you swipe along, one painted
 * matka per category you spent in, biggest first — the same rows the old list
 * showed. The last niches hold "show all" (hidden and zero categories) and an
 * unpainted pot to add a new one. Doors: stairs up on the left, savings on the right.
 */
export function CategoriesRoom({ categories, totals, onOpenCategory, onCategoryCreated, onUp, onSavings, camX, onWidth }: Props) {
  const [showHidden, setShowHidden] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const { items, max } = useMemo(() => {
    // Same selection and order as CategoryList: spent-in categories first,
    // untagged money as its own pot, everything else folded behind "show all".
    const shown: Category[] = categories.filter((c) => !c.hidden && volume(totals[c.id]) > 0);
    const untagged = totals[UNCATEGORIZED_ID];
    if (volume(untagged) > 0) shown.push({ id: UNCATEGORIZED_ID, label: 'untagged', colorHex: '#C9C2BA', createdAt: 0 });
    const byVolume = (a: Category, b: Category) => volume(totals[b.id]) - volume(totals[a.id]);
    shown.sort(byVolume);
    const hidden = categories.filter((c) => c.hidden || volume(totals[c.id]) === 0).sort(byVolume);
    const list: Item[] = shown.map((c) => ({ kind: 'cat' as const, category: c, total: totals[c.id] ?? { spent: 0, received: 0 } }));
    if (showHidden) hidden.forEach((c) => list.push({ kind: 'cat', category: c, total: totals[c.id] ?? { spent: 0, received: 0 } }));
    if (hidden.length > 0) list.push({ kind: 'more', hiddenCount: hidden.length, open: showHidden });
    list.push({ kind: 'add' });
    return { items: list, max: Math.max(...shown.map((c) => volume(totals[c.id])), 1) };
  }, [categories, totals, showHidden]);

  const cols = Math.max(MIN_COLS, Math.ceil(items.length / 2));
  const width = L.leftW + cols * L.colW + L.rightW;

  useEffect(() => onWidth(width), [width, onWidth]);
  const camStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -camX.value }] }));

  const renderItem = (item: Item, i: number) => {
    const col = Math.floor(i / 2), row = i % 2;
    const nx = L.leftW + col * L.colW + (L.colW - NI.w) / 2, ny = L.rows[row];
    const potLeft = nx + (NI.w - POT.w) / 2, potTop = ny + 92 - POT.h + 4;
    const labelTop = ny + NI.h + 2;
    let pot: any = PLAIN_POT, name = '', amount = '', amountColor: string = W.ink, border: string = W.outline, onPress = () => {};
    if (item.kind === 'cat') {
      const v = volume(item.total), share = v / max;
      const fill = share > 0.4 ? 3 : share > 0.12 ? 2 : v >= 1000 ? 1 : 0;
      pot = potFor(item.category.id === UNCATEGORIZED_ID ? 'untagged' : item.category.id, fill);
      name = item.category.label;
      const spent = Math.max(item.total.spent, 0);
      amount = spent > 0 || item.total.received === 0 ? rupees(spent) : `+${rupees(item.total.received)}`;
      if (spent === 0 && item.total.received > 0) amountColor = W.green;
      border = '#B57760';
      onPress = () => onOpenCategory(item.category.id);
    } else if (item.kind === 'more') {
      name = item.open ? 'show less' : `show all (${item.hiddenCount})`;
      onPress = () => setShowHidden((v) => !v);
    } else {
      name = '+ new pot';
      onPress = () => setAddOpen(true);
    }
    return (
      <Pressable key={item.kind === 'cat' ? item.category.id : item.kind} onPress={onPress} style={{ position: 'absolute', left: nx - 4, top: ny, width: NI.w + 8, height: NI.h + 48 }} accessibilityRole="button" accessibilityLabel={name}>
        <Image source={NICHE} style={{ position: 'absolute', left: 4, top: 0, width: NI.w, height: NI.h }} fadeDuration={0} />
        {item.kind !== 'more' && (
          <Image source={pot} style={{ position: 'absolute', left: potLeft - nx + 4, top: potTop - ny, width: POT.w, height: POT.h, opacity: item.kind === 'add' ? 0.75 : 1 }} fadeDuration={0} />
        )}
        {item.kind === 'more' && <Text style={styles.moreDots}>···</Text>}
        <PixelPanel style={[styles.label, { top: labelTop - ny }]} b={2} border={border}>
          <Text style={[styles.name, name.length > 11 && styles.nameSmall]} numberOfLines={1}>{name}</Text>
          {amount !== '' && <Text style={[styles.amount, { color: amountColor }]}>{amount}</Text>}
        </PixelPanel>
      </Pressable>
    );
  };

  return (
    <>
      <Animated.View style={[styles.world, { width }, camStyle]}>
        <View style={{ width, height: 780 }}>
          <View style={styles.strip}>
            <Image source={LEFT} style={{ width: L.leftW, height: 780 }} fadeDuration={0} />
            {Array.from({ length: cols }, (_, i) => (
              <Image key={i} source={MID} style={{ width: L.colW, height: 780 }} fadeDuration={0} />
            ))}
            <Image source={RIGHT} style={{ width: L.rightW, height: 780 }} fadeDuration={0} />
          </View>
          {items.map(renderItem)}
          <Pressable style={[styles.door, { left: L.upDoor.x, top: L.upDoor.y, width: L.upDoor.w, height: L.upDoor.h }]} onPress={onUp} accessibilityRole="button" accessibilityLabel="Stairs up to the main room" />
          <Text style={[styles.doorLabel, { left: L.upDoor.labelX - 50, top: L.upDoor.labelY - 14 }]}>↑ main</Text>
          <Pressable
            style={[styles.door, { left: width - L.rightW + L.svDoorFromRight.x, top: L.svDoorFromRight.y, width: L.svDoorFromRight.w, height: L.svDoorFromRight.h }]}
            onPress={onSavings}
            accessibilityRole="button"
            accessibilityLabel="Door to the savings room"
          />
          <Text style={[styles.doorLabel, { left: width - L.rightW + L.svDoorFromRight.labelX - 50, top: L.svDoorFromRight.labelY - 14 }]}>savings ›</Text>
        </View>
      </Animated.View>
      <AddCategorySheet visible={addOpen} existingCategories={categories} onClose={() => setAddOpen(false)} onCreate={onCategoryCreated} />
    </>
  );
}

const styles = StyleSheet.create({
  world: { position: 'absolute', left: 0, top: 0, height: 780 },
  strip: { position: 'absolute', left: 0, top: 0, flexDirection: 'row' },
  label: { position: 'absolute', left: -2, width: 112, height: 40, alignItems: 'center', justifyContent: 'center' },
  name: { ...pixelText(4), color: W.ink },
  nameSmall: { ...pixelText(3) },
  amount: { ...pixelText(5), color: W.ink, marginTop: 2 },
  moreDots: { position: 'absolute', left: 4, width: 100, top: 34, textAlign: 'center', ...pixelText(8), color: '#F8D6C0' },
  door: { position: 'absolute' },
  doorLabel: { position: 'absolute', width: 100, textAlign: 'center', ...pixelText(4), color: W.clayLabel },
});
