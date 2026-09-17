import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { base } from '../theme/colors';
import { sizing, typography, heading } from '../theme/tokens';
import { Transaction } from '../data/db';

type Props = {
  transaction: Transaction;
  onUntag: () => void;
  onDelete: () => void;
  onNote: () => void;
};

export function TransactionRow({ transaction, onUntag, onDelete, onNote }: Props) {
  const swipeRef = useRef<Swipeable>(null);
  const date = new Date(transaction.timestamp);

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={() => (
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: base.backgroundSecondary }]}
            onPress={() => {
              swipeRef.current?.close();
              onNote();
            }}
          >
            <Text style={styles.actionText}>note</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: base.backgroundTertiary }]}
            onPress={() => {
              swipeRef.current?.close();
              onUntag();
            }}
          >
            <Text style={styles.actionText}>untag</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: base.negative }]}
            onPress={() => {
              swipeRef.current?.close();
              onDelete();
            }}
          >
            <Text style={[styles.actionText, { color: base.primaryB }]}>delete</Text>
          </Pressable>
        </View>
      )}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.payee} numberOfLines={1}>{transaction.payee}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.bankTag}>{transaction.bank}{transaction.accountLast4 ? ` •${transaction.accountLast4}` : ''}</Text>
            <Text style={styles.date}>
              {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
          {!!transaction.note && (
            <Text style={styles.note} numberOfLines={2}>{transaction.note}</Text>
          )}
        </View>
        <Text style={styles.amount}>
          {transaction.direction === 'debit' ? '-' : '+'}₹{transaction.amount.toLocaleString('en-IN')}
        </Text>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: base.backgroundPrimary,
    paddingVertical: sizing.scale600,
    paddingHorizontal: sizing.scale600,
    borderBottomWidth: 1,
    borderBottomColor: base.backgroundTertiary,
  },
  payee: { ...typography.LabelMedium, color: base.contentMuted },
  metaRow: { flexDirection: 'row', gap: sizing.scale400, marginTop: sizing.scale100 },
  bankTag: { ...typography.ParagraphXSmall, color: base.contentMuted },
  date: { ...typography.ParagraphXSmall, color: base.contentMuted },
  note: { ...typography.ParagraphXSmall, color: base.contentMuted, marginTop: sizing.scale100 },
  amount: { ...heading.Body, color: base.contentPrimary },
  actions: { flexDirection: 'row' },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
  },
  actionText: { ...heading.XSmall, color: base.contentPrimary },
});
