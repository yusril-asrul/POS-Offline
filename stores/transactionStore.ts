import { create } from 'zustand';
import type { SQLiteDatabase } from '@/services/database';

export interface CartItem {
  product_id: number;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
}

export interface Transaction {
  id: number;
  total: number;
  payment_method: string;
  payment_amount: number;
  change: number;
  created_at: string;
}

export interface TransactionItem {
  id: number;
  transaction_id: number;
  product_id: number;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
}

interface TransactionState {
  cart: CartItem[];
  transactions: Transaction[];
  loading: boolean;
  addToCart: (product: { id: number; name: string; price: number }) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  checkout: (db: SQLiteDatabase, paymentMethod: string, paymentAmount: number) => Promise<void>;
  loadTransactions: (db: SQLiteDatabase) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  cart: [],
  transactions: [],
  loading: false,

  addToCart: (product) => {
    const { cart } = get();
    const existing = cart.find((item) => item.product_id === product.id);

    if (existing) {
      set({
        cart: cart.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.product_price,
              }
            : item
        ),
      });
    } else {
      set({
        cart: [
          ...cart,
          {
            product_id: product.id,
            product_name: product.name,
            product_price: product.price,
            quantity: 1,
            subtotal: product.price,
          },
        ],
      });
    }
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set({
      cart: get().cart.map((item) =>
        item.product_id === productId
          ? { ...item, quantity, subtotal: quantity * item.product_price }
          : item
      ),
    });
  },

  removeFromCart: (productId) => {
    set({ cart: get().cart.filter((item) => item.product_id !== productId) });
  },

  clearCart: () => set({ cart: [] }),

  checkout: async (db, paymentMethod, paymentAmount) => {
    const { cart } = get();
    if (cart.length === 0) return;

    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const change = paymentAmount - total;

    await db.withExclusiveTransactionAsync(async (txn) => {
      const result = await txn.runAsync(
        'INSERT INTO transactions (total, payment_method, payment_amount, change) VALUES (?, ?, ?, ?)',
        total,
        paymentMethod,
        paymentAmount,
        change >= 0 ? change : 0
      );
      const transactionId = result.lastInsertRowId;

      for (const item of cart) {
        await txn.runAsync(
          'INSERT INTO transaction_items (transaction_id, product_id, product_name, product_price, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
          transactionId,
          item.product_id,
          item.product_name,
          item.product_price,
          item.quantity,
          item.subtotal
        );
      }
    });

    set({ cart: [] });
    await get().loadTransactions(db);
  },

  loadTransactions: async (db) => {
    set({ loading: true });
    const transactions = await db.getAllAsync<Transaction>(
      'SELECT * FROM transactions ORDER BY created_at DESC'
    );
    set({ transactions, loading: false });
  },
}));
