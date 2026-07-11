import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Shadows } from '@/constants/theme';
import { useLockOrientation } from '@/hooks/use-orientation';
import { useProductStore, type Product } from '@/stores/productStore';
import { useTransactionStore, type CartItem } from '@/stores/transactionStore';
import { usePrinterStore } from '@/stores/printerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { buildReceiptText, printReceipt } from '@/services/print';
import { useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TransactionScreen() {
  const router = useRouter();
  useLockOrientation(ScreenOrientation.OrientationLock.LANDSCAPE);

  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { products, loadProducts } = useProductStore();
  const { cart, addToCart, updateQuantity, removeFromCart, checkout } =
    useTransactionStore();
  const { storeName: settingsStoreName, businessType, loadSettings } = useSettingsStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'tunai' | 'qris'>('tunai');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTotal, setSuccessTotal] = useState(0);
  const [successDailySeq, setSuccessDailySeq] = useState(0);
  const [lastTransaction, setLastTransaction] = useState<{
    items: CartItem[];
    paymentMethod: 'tunai' | 'qris';
    paymentAmount: number;
    change: number;
  } | null>(null);

  useEffect(() => {
    loadProducts(db);
    loadSettings(db);
  }, [db, loadProducts, loadSettings]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const parsedAmount = parseInt(paymentAmount.replace(/\./g, ''), 10) || 0;
  const change = Math.max(0, parsedAmount - total);

  const handleNumpadPress = (value: string) => {
    if (value === 'backspace') {
      setPaymentAmount((prev) => prev.slice(0, -1));
    } else if (value === 'clear') {
      setPaymentAmount('');
    } else {
      setPaymentAmount((prev) => prev + value);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'tunai' && parsedAmount < total) return;
    setSuccessTotal(total);
    setLastTransaction({
      items: [...cart],
      paymentMethod,
      paymentAmount: parsedAmount || total,
      change,
    });
    const dailySeq = await checkout(db, paymentMethod, parsedAmount || total);
    setSuccessDailySeq(dailySeq);
    setPaymentAmount('');
    setShowSuccess(true);
  };

  const handleSelesaiMenjual = () => {
    router.back();
  };

  const handleDone = () => {
    setStep(1);
    setShowSuccess(false);
    setPaymentAmount('');
    setLastTransaction(null);
  };

  return (
    <ThemedView style={[styles.container, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      {step === 1 ? (
        <Step1View
          search={search}
          onChangeSearch={setSearch}
          filteredProducts={filteredProducts}
          cart={cart}
          total={total}
          onAddToCart={(p) => addToCart(p)}
          onUpdateQty={(id, qty) => updateQuantity(id, qty)}
          onRemove={(id) => removeFromCart(id)}
          onNext={() => setStep(2)}
          onDone={handleSelesaiMenjual}
        />
      ) : showSuccess ? (
        <SuccessView
          total={successTotal}
          transactionId={successDailySeq}
          lastTransaction={lastTransaction}
          onDone={handleDone}
        />
      ) : (
        <Step2View
          cart={cart}
          total={total}
          paymentMethod={paymentMethod}
          paymentAmount={paymentAmount}
          parsedAmount={parsedAmount}
          change={change}
          onChangeMethod={setPaymentMethod}
          onNumpadPress={handleNumpadPress}
          onSetAmount={(v) => setPaymentAmount(v)}
          onBack={() => setStep(1)}
          onConfirm={handleCheckout}
        />
      )}
    </ThemedView>
  );
}

function Step1View({
  search,
  onChangeSearch,
  filteredProducts,
  cart,
  total,
  onAddToCart,
  onUpdateQty,
  onRemove,
  onNext,
  onDone,
}: {
  search: string;
  onChangeSearch: (v: string) => void;
  filteredProducts: Product[];
  cart: CartItem[];
  total: number;
  onAddToCart: (p: { id: number; name: string; price: number }) => void;
  onUpdateQty: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
  onNext: () => void;
  onDone: () => void;
}) {
  return (
    <>
      <View style={styles.leftPanel}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari produk..."
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={onChangeSearch}
        />
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.productGrid}
          columnWrapperStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => onAddToCart(item)} />
          )}
          ListEmptyComponent={
            <ThemedText style={styles.emptyText}>Tidak ada produk</ThemedText>
          }
        />
      </View>

      <View style={styles.rightPanel}>
        <View style={styles.rightHeader}>
          <ThemedText type="title" style={{ fontSize: 18 }}>Keranjang</ThemedText>
          <Button title="Selesai Menjual" variant="outline" size="sm" onPress={onDone} />
        </View>

        <FlatList
          data={cart}
          keyExtractor={(item) => item.product_id.toString()}
          contentContainerStyle={styles.cartList}
          renderItem={({ item }) => (
            <Card padding={10} style={{ marginBottom: 6 }}>
              <View style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <ThemedText type="defaultSemiBold" style={{ fontSize: 12 }}>{item.product_name}</ThemedText>
                  <ThemedText style={{ fontSize: 11 }}>
                    Rp {item.product_price.toLocaleString()} x {item.quantity}
                  </ThemedText>
                  <ThemedText type="defaultSemiBold" style={{ fontSize: 12, color: Colors.tint }}>
                    Rp {item.subtotal.toLocaleString()}
                  </ThemedText>
                </View>
                <View style={styles.cartItemActions}>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => onUpdateQty(item.product_id, item.quantity - 1)}
                  >
                    <ThemedText style={{ fontWeight: '700' }}>-</ThemedText>
                  </Pressable>
                  <ThemedText style={{ fontWeight: '600', minWidth: 16, textAlign: 'center' }}>
                    {item.quantity}
                  </ThemedText>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => onUpdateQty(item.product_id, item.quantity + 1)}
                  >
                    <ThemedText style={{ fontWeight: '700' }}>+</ThemedText>
                  </Pressable>
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => onRemove(item.product_id)}
                  >
                    <ThemedText style={{ fontSize: 14 }}>{'\u{1F5D1}'}</ThemedText>
                  </Pressable>
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <ThemedText style={styles.emptyText}>Keranjang masih kosong</ThemedText>
          }
        />

        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>Total</ThemedText>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 18, color: Colors.success }}>
              Rp {total.toLocaleString()}
            </ThemedText>
          </View>
          <Button
            title="Lanjutkan ke Pembayaran"
            disabled={cart.length === 0}
            onPress={onNext}
          />
        </View>
      </View>
    </>
  );
}

function Step2View({
  cart,
  total,
  paymentMethod,
  paymentAmount,
  parsedAmount,
  change,
  onChangeMethod,
  onNumpadPress,
  onSetAmount,
  onBack,
  onConfirm,
}: {
  cart: CartItem[];
  total: number;
  paymentMethod: 'tunai' | 'qris';
  paymentAmount: string;
  parsedAmount: number;
  change: number;
  onChangeMethod: (m: 'tunai' | 'qris') => void;
  onNumpadPress: (v: string) => void;
  onSetAmount: (v: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const canConfirm =
    paymentMethod === 'qris' ||
    (paymentMethod === 'tunai' && parsedAmount >= total && paymentAmount.length > 0);

  const formatRupiah = (val: string) => {
    if (!val) return '0';
    const num = parseInt(val, 10);
    return num.toLocaleString('id-ID');
  };

  return (
    <>
      <View style={styles.colSummary}>
        <Pressable onPress={onBack} style={styles.backRow}>
          <ThemedText style={{ color: Colors.tint, fontWeight: '600' }}>
            {'\u2190'} Kembali
          </ThemedText>
        </Pressable>

        <ThemedText type="subtitle" style={{ marginBottom: 12 }}>Ringkasan Pesanan</ThemedText>

        <FlatList
          data={cart}
          keyExtractor={(item) => item.product_id.toString()}
          contentContainerStyle={{ gap: 6 }}
          renderItem={({ item }) => (
            <Card padding={10}>
              <View style={styles.summaryItem}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold" style={{ fontSize: 12 }}>{item.product_name}</ThemedText>
                  <ThemedText style={{ fontSize: 11, color: Colors.placeholder }}>
                    {item.quantity}x Rp {item.product_price.toLocaleString()}
                  </ThemedText>
                </View>
                <ThemedText type="defaultSemiBold" style={{ fontSize: 12 }}>
                  Rp {item.subtotal.toLocaleString()}
                </ThemedText>
              </View>
            </Card>
          )}
        />

        <Card padding={12} style={{ marginTop: 8 }}>
          <View style={styles.totalRow}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>Grand Total</ThemedText>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 18, color: Colors.success }}>
              Rp {total.toLocaleString()}
            </ThemedText>
          </View>
        </Card>
      </View>

      <View style={styles.colPayment}>
        <ThemedText type="title" style={{ marginBottom: 16, fontSize: 18 }}>Pembayaran</ThemedText>

        <View style={styles.paymentMethods}>
          <Pressable
            style={[styles.paymentBtn, paymentMethod === 'tunai' && styles.paymentBtnActive]}
            onPress={() => onChangeMethod('tunai')}
          >
            <ThemedText style={paymentMethod === 'tunai' ? { color: '#fff', fontWeight: '600' } : {}}>
              Tunai
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.paymentBtn, paymentMethod === 'qris' && styles.paymentBtnActive]}
            onPress={() => onChangeMethod('qris')}
          >
            <ThemedText style={paymentMethod === 'qris' ? { color: '#fff', fontWeight: '600' } : {}}>
              QRIS
            </ThemedText>
          </Pressable>
        </View>

        {paymentMethod === 'tunai' ? (
          <>
            <Card padding={12} style={{ marginVertical: 12 }}>
              <ThemedText style={{ fontSize: 11, color: Colors.placeholder, marginBottom: 4 }}>
                Jumlah Bayar
              </ThemedText>
              <ThemedText style={styles.amountText}>
                Rp {formatRupiah(paymentAmount)}
              </ThemedText>
            </Card>

            {paymentAmount.length > 0 && parsedAmount >= total && (
              <View style={styles.changeRow}>
                <ThemedText style={{ fontWeight: '600', fontSize: 12 }}>Kembalian</ThemedText>
                <ThemedText style={{ fontWeight: '600', fontSize: 16, color: Colors.success }}>
                  Rp {change.toLocaleString('id-ID')}
                </ThemedText>
              </View>
            )}
          </>
        ) : (
          <View style={styles.qrisInfo}>
            <ThemedText style={{ fontSize: 48 }}>{'\u{1F4B3}'}</ThemedText>
            <ThemedText style={{ textAlign: 'center', color: Colors.placeholder, marginTop: 8 }}>
              Scan QRIS untuk membayar
            </ThemedText>
          </View>
        )}

        <Button
          title="Konfirmasi & Bayar"
          disabled={!canConfirm}
          variant={canConfirm ? 'primary' : 'secondary'}
          onPress={onConfirm}
        />
      </View>

      <View style={styles.colNumpad}>
        {paymentMethod === 'tunai' ? (
          <View>
            <NumericKeypad onPress={onNumpadPress} />
            <Button
              title="Uang Pas"
              variant="outline"
              size="sm"
              onPress={() => onSetAmount(total.toString())}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : (
          <View style={styles.qrisPlaceholder}>
            <ThemedText style={{ fontSize: 64 }}>{'\u{1F4B3}'}</ThemedText>
            <ThemedText style={{ textAlign: 'center', color: Colors.placeholder, marginTop: 8, fontSize: 13 }}>
              Tampilkan QRIS
            </ThemedText>
          </View>
        )}
      </View>
    </>
  );
}

function NumericKeypad({ onPress }: { onPress: (v: string) => void }) {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['clear', '0', 'backspace'],
  ];

  return (
    <View style={styles.numpad}>
      {keys.map((row, ri) => (
        <View key={ri} style={styles.numpadRow}>
          {row.map((key) => {
            if (key === '') return <View key={`e${ri}`} style={styles.numpadKey} />;
            return (
              <Pressable
                key={key}
                style={({ pressed }) => [
                  styles.numpadKey,
                  pressed && styles.numpadKeyPressed,
                ]}
                onPress={() => onPress(key)}
              >
                {key === 'backspace' ? (
                  <ThemedText style={styles.numpadKeyText}>{'\u232B'}</ThemedText>
                ) : key === 'clear' ? (
                  <ThemedText style={[styles.numpadKeyText, { color: Colors.danger }]}>C</ThemedText>
                ) : (
                  <ThemedText style={styles.numpadKeyText}>{key}</ThemedText>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function SuccessView({
  total,
  transactionId,
  lastTransaction,
  onDone,
}: {
  total: number;
  transactionId: number;
  lastTransaction: {
    items: CartItem[];
    paymentMethod: 'tunai' | 'qris';
    paymentAmount: number;
    change: number;
  } | null;
  onDone: () => void;
}) {
  const { storeName, businessType } = useSettingsStore();
  const { printerTarget, printerName } = usePrinterStore();
  const router = useRouter();

  const handlePrint = async () => {
    if (!printerTarget) {
      Alert.alert('Printer belum terhubung', 'Hubungkan printer di tab Printer terlebih dahulu.', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Buka Printer', onPress: () => router.push('/(tabs)/printer') },
      ]);
      return;
    }

    if (!lastTransaction) return;

    try {
      const receipt = buildReceiptText({
        transactionId,
        createdAt: new Date().toISOString(),
        items: lastTransaction.items,
        total,
        paymentMethod: lastTransaction.paymentMethod,
        paymentAmount: lastTransaction.paymentAmount,
        change: lastTransaction.change,
        storeName,
        storeAddress: businessType,
      });
      await printReceipt(receipt);
      Alert.alert('Sukses', 'Struk berhasil dicetak');
    } catch {
      Alert.alert('Gagal', 'Cetak struk gagal. Periksa koneksi printer.');
    }
  };

  return (
    <View style={styles.successContainer}>
      <Card padding={32} style={{ alignItems: 'center', gap: 8 }}>
        <ThemedText style={{ fontSize: 64, lineHeight: 72 }}>{'\u2705'}</ThemedText>
        <ThemedText type="title" style={{ textAlign: 'center' }}>Pembayaran Berhasil!</ThemedText>
        <ThemedText style={{ fontSize: 28, lineHeight: 34, fontWeight: 'bold', color: Colors.success }}>
          Rp {total.toLocaleString()}
        </ThemedText>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <Button title="Cetak Struk" variant="outline" onPress={handlePrint} />
          <Button title="Selesai" onPress={onDone} />
        </View>
        {!printerName && (
          <ThemedText style={{ fontSize: 11, color: Colors.placeholder }}>
            Belum ada printer. Cetak struk tidak tersedia.
          </ThemedText>
        )}
      </Card>
    </View>
  );
}

function ProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.productCard, pressed && { opacity: 0.85 }]} onPress={onPress}>
      {product.image_path ? (
        <Image source={{ uri: product.image_path }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <ThemedText style={{ color: Colors.muted, fontSize: 18 }}>{'\u{1F5BC}'}</ThemedText>
        </View>
      )}
      <ThemedText
        type="defaultSemiBold"
        numberOfLines={2}
        style={{ textAlign: 'center', fontSize: 12 }}
      >
        {product.name}
      </ThemedText>
      <ThemedText style={{ textAlign: 'center', fontSize: 11, color: Colors.tint, fontWeight: '600' }}>
        Rp {product.price.toLocaleString()}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#f5f5f5' },

  // Step 1
  leftPanel: { flex: 1, padding: 12 },
  rightPanel: { flex: 1, padding: 12, borderLeftWidth: 1, borderLeftColor: Colors.border },
  rightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    fontSize: 13,
    backgroundColor: Colors.card,
  },
  productGrid: { paddingBottom: 16 },
  productCard: {
    flex: 1,
    marginBottom: 8,
    padding: 10,
    borderRadius: 12,
    gap: 6,
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  cardImage: { width: 64, height: 64, borderRadius: 8 },
  cardImagePlaceholder: {
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { textAlign: 'center', marginTop: 20, color: Colors.muted },
  cartList: { flexGrow: 0 },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cartItemInfo: { flex: 1, gap: 2 },
  cartItemActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  removeBtn: {
    padding: 4,
  },
  footer: { marginTop: 12, gap: 12 },

  // Step 2 — 3 columns
  colSummary: { flex: 1, padding: 12 },
  colPayment: {
    flex: 0.9,
    padding: 12,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    justifyContent: 'space-between',
  },
  colNumpad: {
    flex: 0.7,
    padding: 8,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    justifyContent: 'center',
  },

  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backRow: { marginBottom: 12 },

  paymentMethods: { flexDirection: 'row', gap: 8 },
  paymentBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  paymentBtnActive: { backgroundColor: Colors.tint },

  amountText: { fontSize: 28, lineHeight: 34, fontWeight: 'bold', textAlign: 'right' },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.successBg,
    marginBottom: 12,
  },

  qrisInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrisPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Numpad
  numpad: { gap: 0 },
  numpadRow: { flexDirection: 'row' },
  numpadKey: {
    flex: 1,
    height: 52,
    borderWidth: 0.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  numpadKeyPressed: { backgroundColor: '#e8e8e8' },
  numpadKeyText: { fontSize: 22, fontWeight: '600' },

  // Success
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
