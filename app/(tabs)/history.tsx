import * as ScreenOrientation from 'expo-screen-orientation';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useLockOrientation } from '@/hooks/use-orientation';
import { useTransactionStore, type Transaction } from '@/stores/transactionStore';
import { Colors, Shadows } from '@/constants/theme';

export default function HistoryScreen() {
  useLockOrientation(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { transactions, loadTransactions } = useTransactionStore();
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    loadTransactions(db);
  }, [db, loadTransactions]);

  const selectTransaction = async (t: Transaction) => {
    setSelected(t);
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM transaction_items WHERE transaction_id = ?',
      t.id
    );
    setItems(rows);
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (selected) {
    return (
      <ThemedView style={[styles.container, { paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
        <Pressable onPress={() => setSelected(null)} style={styles.backRow}>
          <ThemedText style={{ color: Colors.tint, fontWeight: '600', fontSize: 14 }}>
            &larr; Kembali
          </ThemedText>
        </Pressable>

        <Card style={{ marginBottom: 16 }}>
          <ThemedText type="title" style={{ marginBottom: 12 }}>Detail Transaksi</ThemedText>
          <View style={styles.detailRow}>
            <ThemedText style={{ color: Colors.placeholder }}>Tanggal</ThemedText>
            <ThemedText type="defaultSemiBold">{formatDate(selected.created_at)}</ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText style={{ color: Colors.placeholder }}>Pembayaran</ThemedText>
            <Badge
              label={selected.payment_method.toUpperCase()}
              variant={selected.payment_method === 'qris' ? 'info' : 'success'}
            />
          </View>
          <View style={styles.detailRow}>
            <ThemedText style={{ color: Colors.placeholder }}>Bayar</ThemedText>
            <ThemedText type="defaultSemiBold">Rp {selected.payment_amount.toLocaleString()}</ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText style={{ color: Colors.placeholder }}>Kembalian</ThemedText>
            <ThemedText type="defaultSemiBold">Rp {selected.change.toLocaleString()}</ThemedText>
          </View>
        </Card>

        <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>Item</ThemedText>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ gap: 6 }}
          renderItem={({ item }) => (
            <Card padding={10}>
              <View style={styles.detailRow}>
                <ThemedText style={{ flex: 2 }}>{item.product_name}</ThemedText>
                <ThemedText style={{ flex: 1, textAlign: 'center' }}>{item.quantity}x</ThemedText>
                <ThemedText style={{ flex: 1, textAlign: 'right', fontWeight: '600' }}>
                  Rp {item.subtotal.toLocaleString()}
                </ThemedText>
              </View>
            </Card>
          )}
        />

        <Card style={{ marginTop: 12 }}>
          <View style={styles.detailRow}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>Total</ThemedText>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
              Rp {selected.total.toLocaleString()}
            </ThemedText>
          </View>
        </Card>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
      <ThemedText type="title" style={{ marginBottom: 16 }}>Riwayat Transaksi</ThemedText>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ gap: 8 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => selectTransaction(item)}>
            <Card style={styles.transactionCard}>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ThemedText type="defaultSemiBold">#{item.id}</ThemedText>
                  <Badge
                    label={item.payment_method.toUpperCase()}
                    variant={item.payment_method === 'qris' ? 'info' : 'success'}
                  />
                </View>
                <ThemedText style={{ color: Colors.placeholder, fontSize: 12 }}>
                  {formatDate(item.created_at)}
                </ThemedText>
                <ThemedText type="defaultSemiBold">
                  Rp {item.total.toLocaleString()}
                </ThemedText>
              </View>
              <ThemedText style={{ color: Colors.muted }}>{'\u203A'}</ThemedText>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={'\u{1F4CB}'}
            title="Belum ada transaksi"
            subtitle="Transaksi akan muncul di sini"
          />
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  backRow: { marginBottom: 16 },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
});
