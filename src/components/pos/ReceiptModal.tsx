import React from 'react';
import { Printer, CheckCircle, Share2 } from 'lucide-react';
import { Sale, ShopSettings } from '../../types';
import { Modal } from '../common/Modal';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  shopSettings: ShopSettings;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  shopSettings,
}) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="বিক্রয় রসিদ (Cash Memo)"
      subtitle={`মেমো নম্বর: ${sale.invoiceNo}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Success badge */}
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs text-emerald-900">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <span className="font-semibold">বিক্রি সফলভাবে সম্পন্ন হয়েছে (ডেমো)।</span>
            <span className="block text-emerald-700 text-[11px]">
              রসিদ প্রিন্ট করতে পারেন অথবা গ্রাহককে শেয়ার করতে পারেন।
            </span>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div
          id="printable-receipt"
          className="bg-white p-5 border border-slate-300 rounded-lg text-slate-800 text-xs shadow-xs font-mono leading-relaxed"
        >
          {/* Shop Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-0.5">
            <h2 className="text-base font-bold text-slate-950 font-sans tracking-tight">
              {shopSettings.shopName}
            </h2>
            <p className="text-[11px] text-slate-600 font-sans">{shopSettings.tagline}</p>
            <p className="text-[11px] text-slate-500 font-sans">{shopSettings.address}</p>
            <p className="text-[11px] text-slate-700">
              মোবাইল: <span className="tabular-nums">{shopSettings.phone}</span>
            </p>
            {shopSettings.vatNumber && (
              <p className="text-[10px] text-slate-400">
                ভ্যাট নিবন্ধন: {shopSettings.vatNumber}
              </p>
            )}
          </div>

          {/* Invoice Meta */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">মেমো নং:</span>
              <span className="font-bold text-slate-900 tabular-nums">{sale.invoiceNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">তারিখ ও সময়:</span>
              <span className="tabular-nums">{sale.createdAt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">বিক্রয় কর্মী:</span>
              <span>{sale.soldBy}</span>
            </div>
            {sale.customerName && (
              <div className="flex justify-between font-sans">
                <span className="text-slate-500">গ্রাহক:</span>
                <span className="font-medium text-slate-900">{sale.customerName}</span>
              </div>
            )}
            {sale.customerPhone && (
              <div className="flex justify-between">
                <span className="text-slate-500">গ্রাহক ফোন:</span>
                <span className="tabular-nums">{sale.customerPhone}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="py-2.5 border-b border-dashed border-slate-300">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[10px]">
                  <th className="pb-1">বিবরণ</th>
                  <th className="pb-1 text-center">পরিমাণ</th>
                  <th className="pb-1 text-right">দর</th>
                  <th className="pb-1 text-right">মোট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item, idx) => (
                  <tr key={idx} className="text-[11px]">
                    <td className="py-1 font-sans pr-1">
                      <div className="font-medium text-slate-900 leading-tight">
                        {item.product.name}
                      </div>
                    </td>
                    <td className="py-1 text-center tabular-nums">
                      {item.quantity} {item.product.unit}
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      ৳{item.unitPrice}
                    </td>
                    <td className="py-1 text-right tabular-nums font-semibold">
                      ৳{item.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">সাব-টোটাল:</span>
              <span className="tabular-nums font-medium">৳{sale.subtotal}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>ছাড় (ডিসকাউন্ট):</span>
                <span className="tabular-nums font-medium">-৳{sale.discount}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-950 pt-1 border-t border-slate-200">
              <span>সর্বমোট প্রদেয়:</span>
              <span className="tabular-nums">৳{sale.grandTotal}</span>
            </div>
            <div className="flex justify-between text-slate-800">
              <span>পরিশোধিত:</span>
              <span className="tabular-nums font-semibold text-emerald-800">
                ৳{sale.paidAmount}
              </span>
            </div>
            {sale.dueAmount > 0 && (
              <div className="flex justify-between text-rose-700 font-bold">
                <span>বকেয়া (বাকি):</span>
                <span className="tabular-nums">৳{sale.dueAmount}</span>
              </div>
            )}

            {/* Payment method split breakdown */}
            <div className="pt-1 text-[10px] text-slate-500 flex justify-between">
              <span>পেমেন্ট মাধ্যম:</span>
              <span>
                {sale.payments.map((p) => `${p.method} (৳${p.amount})`).join(', ')}
              </span>
            </div>
          </div>

          {/* Receipt Footer */}
          <div className="pt-3 text-center text-[10px] text-slate-500 font-sans space-y-1">
            <p className="font-medium text-slate-700">{shopSettings.receiptFooterMsg}</p>
            <p className="text-[9px] text-slate-400">
              সফটওয়্যার: স্মার্ট মুদি ম্যানেজার (Smart Mudi Manager)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={() => alert('Phase 1 ডেমো: এসএমএস বা হোয়াটসঅ্যাপে রসিদ লিংক পাঠানোর ফিচার Phase 2-এ কার্যকর হবে।')}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>শেয়ার</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>রসিদ প্রিন্ট করুন</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
