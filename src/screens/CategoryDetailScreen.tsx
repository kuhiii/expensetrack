import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, Pressable, TextInput, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { base } from '../theme/colors';
import { sizing, radius, typography, heading } from '../theme/tokens';
import { useAccent } from '../theme/ThemeContext';
import { TransactionRow } from '../components/TransactionRow';
import { UndoSnackbar } from '../components/UndoSnackbar';
import {
  getTransactionsForCategory,
  setTransactionCategory,
  deleteTransaction,
  setTransactionNote,
  insertTransaction,
  getCategory,
  renameCategory,
  setCategoryIcon,
  setCategoryHidden,
  deleteCategory,
  UNDELETABLE_CATEGORY_IDS,
  Category,
  Transaction,
} from '../data/db';
import { UNCATEGORIZED_ID } from '../data/categories';
import { formatMonthLabel } from '../utils/dateFormat';
import { BottomSheet } from '../components/BottomSheet';
import { IconPicker } from '../components/IconPicker';
import { Image } from 'react-native';
import { GULLAK_LAYOUT } from '../world/gullakLayout';
import { pixelText, W } from '../world/pixel';

// The transactions are written on an old paper scroll, unrolled between two wooden rods.
const SC = GULLAK_LAYOUT.scroll;
const SCROLL_END = require('../../assets/gullak/scroll-end.png');

export function CategoryDetailScreen({ route, navigation }: any) {
  const { categoryId } = route.params;
  const { accent } = useAccent();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  // Notes can be added here too, not just while tagging.
  const [noteFor, setNoteFor] = useState<Transaction | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [iconDraft, setIconDraft] = useState<string | null>(null);
  const editable = categoryId !== UNCATEGORIZED_ID && category !== null;
  const deletable = editable && !UNDELETABLE_CATEGORY_IDS.includes(categoryId);

  const load = useCallback(async () => {
    const [all, cat] = await Promise.all([
      getTransactionsForCategory(categoryId),
      categoryId === UNCATEGORIZED_ID ? Promise.resolve(null) : getCategory(categoryId),
    ]);
    setTransactions(all);
    setCategory(cat);
  }, [categoryId]);

  const openEdit = () => {
    if (!category) return;
    setNameDraft(category.label);
    setIconDraft(category.iconKey ?? null);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!category) return;
    const name = nameDraft.trim();
    if (name && name !== category.label) await renameCategory(category.id, name);
    if (iconDraft && iconDraft !== category.iconKey) await setCategoryIcon(category.id, iconDraft);
    setEditOpen(false);
    load();
  };

  const toggleHidden = async () => {
    if (!category) return;
    await setCategoryHidden(category.id, !category.hidden);
    setEditOpen(false);
    load();
  };

  const confirmDelete = () => {
    if (!category) return;
    Alert.alert(
      `delete ${category.label}?`,
      'its transactions go back to untagged, and payees filed here stop being auto-tagged.',
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(category.id);
            setEditOpen(false);
            navigation.goBack();
          },
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // One section per calendar month, newest first, replacing the old
  // this-month / all-time toggle: the whole history is shown, just grouped.
  const sections = useMemo(() => {
    const byMonth = new Map<string, { title: string; order: number; data: Transaction[] }>();
    for (const t of transactions) {
      const d = new Date(t.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!byMonth.has(key)) {
        byMonth.set(key, {
          title: formatMonthLabel(d.getFullYear(), d.getMonth()),
          order: d.getFullYear() * 12 + d.getMonth(),
          data: [],
        });
      }
      byMonth.get(key)!.data.push(t);
    }
    return [...byMonth.values()].sort((a, b) => b.order - a.order);
  }, [transactions]);

  const openNote = (tx: Transaction) => {
    setNoteFor(tx);
    setNoteDraft(tx.note ?? '');
  };

  const saveNote = async () => {
    if (noteFor) await setTransactionNote(noteFor.id, noteDraft);
    setNoteFor(null);
    setNoteDraft('');
    load();
  };

  const handleUntag = async (tx: Transaction) => {
    await setTransactionCategory(tx.id, UNCATEGORIZED_ID);
    load();
  };

  const handleDelete = async (tx: Transaction) => {
    await deleteTransaction(tx.id);
    setPendingDelete(tx);
    load();
  };

  const handleUndoDelete = async () => {
    if (!pendingDelete) return;
    await insertTransaction({ ...pendingDelete });
    setPendingDelete(null);
    load();
  };

  return (
    <View style={styles.screen}>
      <Image source={SCROLL_END} style={styles.rodTop} fadeDuration={0} />
      <View style={styles.paper}>
      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              {categoryId === UNCATEGORIZED_ID ? 'untagged' : category?.label ?? 'transactions'}
            </Text>
            {category?.hidden && <Text style={styles.hiddenTag}>hidden</Text>}
            {editable && (
              <Pressable onPress={openEdit} hitSlop={12} style={styles.editLink}>
                <Text style={styles.editText}>edit</Text>
              </Pressable>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.monthRow}>
            <View style={styles.monthRule} />
            <Text style={styles.monthHeading}>{section.title}</Text>
            <View style={styles.monthRule} />
          </View>
        )}
        renderItem={({ item }) => (
          <TransactionRow
            transaction={item}
            onUntag={() => handleUntag(item)}
            onDelete={() => handleDelete(item)}
            onNote={() => openNote(item)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>no transactions in {category?.label ?? 'this category'} yet.</Text>
        }
      />
      </View>
      <Image source={SCROLL_END} style={styles.rodBottom} fadeDuration={0} />

      <BottomSheet visible={noteFor !== null} onClose={() => setNoteFor(null)}>
            <Text style={styles.sheetTitle}>
              {noteFor ? `₹${noteFor.amount.toLocaleString('en-IN')} · ${noteFor.payee}` : ''}
            </Text>
            <TextInput
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder="add a note"
              placeholderTextColor={base.contentTertiary}
              style={styles.noteInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveNote}
            />
            <Pressable style={[styles.okayButton, { backgroundColor: accent }]} onPress={saveNote}>
              <Text style={styles.okayText}>okay</Text>
            </Pressable>
      </BottomSheet>

      <BottomSheet visible={editOpen} onClose={() => setEditOpen(false)}>
        <Text style={styles.editHeading}>name</Text>
        <TextInput
          value={nameDraft}
          onChangeText={setNameDraft}
          placeholder="category name"
          placeholderTextColor={base.contentTertiary}
          style={styles.noteInput}
          returnKeyType="done"
        />
        <Text style={[styles.editHeading, styles.editGap]}>icon</Text>
        <IconPicker selected={iconDraft} onSelect={setIconDraft} />
        <Pressable
          style={[styles.okayButton, { backgroundColor: nameDraft.trim() ? accent : base.borderOpaque }]}
          onPress={saveEdit}
          disabled={!nameDraft.trim()}
        >
          <Text style={styles.okayText}>save</Text>
        </Pressable>
        <View style={styles.secondaryRow}>
          <Pressable style={styles.secondaryButton} onPress={toggleHidden}>
            <Text style={styles.secondaryText}>{category?.hidden ? 'unhide' : 'hide'}</Text>
          </Pressable>
          {deletable && (
            <Pressable style={styles.secondaryButton} onPress={confirmDelete}>
              <Text style={[styles.secondaryText, { color: base.negative }]}>delete</Text>
            </Pressable>
          )}
        </View>
      </BottomSheet>

      <UndoSnackbar
        visible={!!pendingDelete}
        message="Deleted"
        onUndo={handleUndoDelete}
        onDismiss={() => setPendingDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EDB89C', paddingTop: 14, paddingBottom: 12, alignItems: 'center' },
  rodTop: { width: SC.w, height: SC.h, zIndex: 2 },
  rodBottom: { width: SC.w, height: SC.h, zIndex: 2 },
  // the unrolled paper between the rods: aged edges darker than the middle
  paper: {
    flex: 1,
    width: SC.w - 44,
    marginVertical: -8,
    backgroundColor: SC.paper,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: SC.paperDark,
  },
  content: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 24 },
  // Same size as the total-spend figure on the home card.
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: sizing.scale400,
    marginTop: sizing.scale500,
    marginBottom: sizing.scale600,
  },
  title: { ...pixelText(9), color: SC.ink, flexShrink: 1 },
  hiddenTag: { ...pixelText(4), color: SC.inkSoft },
  editLink: { marginLeft: 'auto' },
  editText: { ...pixelText(5), color: SC.inkSoft },
  editHeading: { ...heading.Small, color: base.contentFaint },
  editGap: { marginTop: sizing.scale600 },
  secondaryRow: { flexDirection: 'row', gap: sizing.scale400, marginTop: sizing.scale400 },
  secondaryButton: {
    flex: 1,
    borderRadius: radius.radius300,
    paddingVertical: sizing.scale500,
    alignItems: 'center',
    backgroundColor: base.backgroundSecondary,
  },
  secondaryText: { ...heading.Body, color: base.contentPrimary },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 4 },
  monthRule: { flex: 1, height: 2, backgroundColor: SC.paperEdge, opacity: 0.6 },
  monthHeading: { ...pixelText(5), color: SC.red },
  sheetTitle: { ...heading.Medium, color: base.contentPrimary },
  noteInput: {
    backgroundColor: base.backgroundSecondary,
    borderRadius: radius.radius300,
    paddingHorizontal: sizing.scale600,
    paddingVertical: sizing.scale500,
    marginTop: sizing.scale400,
    ...typography.ParagraphMedium,
    color: base.contentPrimary,
  },
  okayButton: {
    marginTop: sizing.scale600,
    borderRadius: radius.radius300,
    paddingVertical: sizing.scale500,
    alignItems: 'center',
  },
  okayText: { ...heading.Body, color: base.primaryB },
  empty: {
    ...pixelText(5, false),
    color: SC.inkSoft,
    textAlign: 'center',
    marginTop: sizing.scale1200,
  },
});
