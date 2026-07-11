# POS Offline

Aplikasi kasir (_Point of Sale_) offline berbasis **Expo / React Native**.  
Dirancang untuk UMKM, toko kecil, dan rumah makan yang membutuhkan sistem kasir sederhana tanpa perlu koneksi internet.

Dibangun dengan `create-expo-app`.

---

## Fitur

| Fitur | Status |
|---|---|
| Manajemen produk — tambah, edit, hapus, gambar | ✅ |
| Transaksi penjualan — keranjang, subtotal, bayar | ✅ |
| Metode pembayaran — Tunai & QRIS statis | ✅ |
| Cetak struk — printer thermal Bluetooth 58mm (ESC/POS) | ✅ |
| Riwayat transaksi — detail pesanan selesai | ✅ |
| Laporan penjualan — rekap harian, mingguan, bulanan | ✅ |
| Pengaturan toko — nama toko & jenis usaha | ✅ |
| Nomor invoice — daily reset (`INV-DDMMYY-001`) | ✅ |
| Manajemen stok — update otomatis & notifikasi stok menipis | ⏳ |
| Kategori produk — filter & kelompok | ⏳ |
| Multi-user — kasir & admin login offline | 📅 |
| Backup & restore — ekspor/impor database | 📅 |

---

## Tech Stack

| Teknologi | Keterangan |
|---|---|
| **Expo SDK 54** | Framework React Native |
| **Expo Router 6** | File-based routing |
| **expo-sqlite** | Database lokal (SQLite) |
| **Zustand** | State management ringan |
| **@vardrz/react-native-bluetooth-escpos-printer** | Cetak struk Bluetooth thermal |
| **expo-symbols** / **@expo/vector-icons** | Ikon (SF Symbols / MaterialIcons) |

---

## Struktur Proyek

```
pos-offline/
├── app/                    # Halaman & navigasi (Expo Router)
│   ├── _layout.tsx         #   Root layout (Stack navigator)
│   ├── (tabs)/
│   │   ├── _layout.tsx     #   Tab navigator (4 tab)
│   │   ├── index.tsx       #   Dashboard
│   │   ├── explore.tsx     #   Produk
│   │   ├── history.tsx     #   Riwayat
│   │   ├── settings.tsx    #   Pengaturan (menu list)
│   │   ├── store-settings.tsx  # Atur Toko
│   │   ├── reports.tsx     #   Laporan
│   │   └── printer.tsx     #   Printer Bluetooth
│   ├── transaksi.tsx       # Transaksi penjualan (landscape)
│   └── modal.tsx           # Modal umum
├── stores/                 # Zustand stores
│   ├── productStore.ts     #   Produk
│   ├── transactionStore.ts #   Transaksi & keranjang
│   ├── printerStore.ts     #   Koneksi printer
│   └── settingsStore.ts    #   Pengaturan toko
├── services/
│   ├── database.ts         # Inisialisasi & migrasi SQLite
│   └── print.ts            # Cetak struk ESC/POS
├── components/             # UI components reusable
├── constants/              # Tema, warna (theme.ts)
└── hooks/                  # Custom hooks
```

---

## Cara Menjalankan

### Prasyarat

- Node.js >= 18
- Expo CLI (`npm install -g expo-cli`)
- Android Studio atau perangkat Android fisik dengan USB debugging
- Expo Go (opsional, untuk development ringan)

### Install & Jalankan

```bash
# Clone & masuk direktori
cd pos-offline

# Install dependencies
npm install

# Start Expo dev server
npx expo start
```

Setelah server berjalan:

- **`a`** — buka di Android emulator / perangkat USB
- **`w`** — buka di web browser (terbatas)
- **`r`** — reload app

### Build APK

```bash
npx expo run:android
```

Atau untuk production build:

```bash
npx expo build:android
```

---

## Catatan Developer

### Database Migration

Semua migrasi SQLite dikelola di `services/database.ts` menggunakan pola version-based:

```ts
const DATABASE_VERSION = 3;
// Setiap versi baru ditangani dengan if (currentDbVersion === N)
```

- Tabel: `products`, `transactions`, `transaction_items`, `settings`
- Penggunaan `expo-sqlite` dengan `SQLiteProvider` + `useSQLiteContext()`

### Cetak Struk (ESC/POS)

Printer thermal Bluetooth 58mm dengan lebar **32 kolom**.  
Format dan alignment diatur di `services/print.ts`:

- **HEADER** — `printerAlign(CENTER)`: nama toko, invoice, tanggal
- **BODY** — `printerAlign(LEFT)`: item, total, pembayaran  
- **FOOTER** — `printerAlign(CENTER)`: terima kasih

Fungsi format kolom otomatis menangani padding, truncation nama produk (22 karakter max), dan right-alignment harga.

### Orientasi Layar

- **Landscape** — halaman transaksi (`app/transaksi.tsx`) — split panel produk ↔ keranjang
- **Portrait** — semua halaman lainnya (Dashboard, Produk, dll)

### State Management

Semua state dikelola dengan **Zustand** tanpa persist middleware.  
Data persisten disimpan di SQLite dan dimuat ulang setiap kali store diinisialisasi.

---
