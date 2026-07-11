import { BluetoothEscposPrinter } from '@vardrz/react-native-bluetooth-escpos-printer';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

export function buildReceiptText(params: {
  transactionId: number;
  createdAt: string;
  items: { product_name: string; quantity: number; product_price: number; subtotal: number }[];
  total: number;
  paymentMethod: string;
  paymentAmount: number;
  change: number;
  storeName?: string;
  storeAddress?: string;
}): string {
  const storeName = params.storeName ?? 'POS Offline';
  const storeAddress = params.storeAddress ?? 'Rumah Makan';

  const divider = '===============================';
  const thinDivider = '-------------------------------';

  const formatDate = (date: string) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = MONTHS[d.getMonth()];
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  };

  const formatInvoice = (id: number) => {
    const d = new Date();
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const yy = d.getFullYear().toString().slice(-2);
    const seq = id.toString().padStart(3, '0');
    return `INV-${dd}${mm}${yy}-${seq}`;
  };

  let receipt = '';

  receipt += `${storeName}\n`;
  receipt += `${storeAddress}\n`;
  receipt += `\n`;
  receipt += `${divider}\n`;
  receipt += `${formatInvoice(params.transactionId)}\n`;
  receipt += `${formatDate(params.createdAt)}\n`;
  receipt += `${thinDivider}\n`;

  for (const item of params.items) {
    const name = item.product_name.length > 16
      ? item.product_name.slice(0, 14) + '..'
      : item.product_name;
    receipt += `${name}                ${item.quantity}x\n`;
    receipt += `  Rp ${item.product_price.toLocaleString('id-ID')}           Rp ${item.subtotal.toLocaleString('id-ID')}\n`;
  }

  receipt += `${thinDivider}\n`;
  receipt += `Total                  Rp ${params.total.toLocaleString('id-ID')}\n`;

  const payLabel = params.paymentMethod === 'tunai' ? 'Tunai' : 'QRIS';
  receipt += `${payLabel.padEnd(22)} Rp ${params.paymentAmount.toLocaleString('id-ID')}\n`;
  receipt += `Kembalian              Rp ${params.change.toLocaleString('id-ID')}\n`;

  receipt += `${divider}\n`;
  receipt += `       Terima Kasih!\n`;
  receipt += `  Silahkan Datang Kembali\n`;

  return receipt;
}

export async function printReceipt(
  receiptText: string
): Promise<void> {
  await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
  await BluetoothEscposPrinter.printText(receiptText, {
    encoding: 'CP437',
    widthtimes: 0,
    heigthtimes: 0,
    fonttype: 0,
  });
  await BluetoothEscposPrinter.printAndFeed(4);
  BluetoothEscposPrinter.cutOnePoint();
}
