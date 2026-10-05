import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { base } from '../theme/colors';
import { sizing, typography, heading } from '../theme/tokens';
import { Transaction } from '../data/db';
import { GULLAK_LAYOUT } from '../world/gullakLayout';
import { pixelText } from '../world/pixel';

const SC = GULLAK_LAYOUT.scroll;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

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
            style={[styles.actionButton, { backgroundColor: SC.paperDark }]}
            onPress={() => {
              swipeRef.current?.close();
              onNote();
            }}
          >
            <Text style={styles.actionText}>note</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: SC.paperEdge }]}
            onPress={() => {
              swipeRef.current?.close();
              onUntag();
            }}
          >
            <Text style={styles.actionText}>untag</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: SC.red }]}
            onPress={() => {
              swipeRef.current?.close();
              onDelete();
            }}
          >
            <Text style={[styles.actionText, { color: SC.paper }]}>delete</Text>
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
              {`${date.getDate()} ${MONTHS[date.getMonth()]}`}
            </Text>
          </View>
          {!!transaction.note && (
            <Text style={styles.note} numberOfLines={2}>{transaction.note}</Text>
          )}
        </View>
        <Text style={[styles.amount, { color: transaction.direction === 'debit' ? SC.ink : SC.green }]}>
          {transaction.direction === 'debit' ? '-' : '+'}₹{transaction.amount.toLocaleString('en-IN')}
        </Text>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  // a line written on the scroll, with a faint ruled line under it
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SC.paper,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: SC.paperDark,
    borderStyle: 'dashed',
  },
  payee: { ...pixelText(5), color: SC.ink },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  bankTag: { ...pixelText(4, false), color: SC.inkSoft },
  date: { ...pixelText(4, false), color: SC.inkSoft },
  note: { ...pixelText(4, false), color: SC.inkSoft, marginTop: 4 },
  amount: { ...pixelText(6), textTransform: 'none' },
  actions: { flexDirection: 'row' },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 76,
  },
  actionText: { ...pixelText(4), color: SC.ink },
});
