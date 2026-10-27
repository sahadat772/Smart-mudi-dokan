import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Building,
  Phone,
  Calendar,
  AlertCircle,
  FileCheck,
  CreditCard,
  CheckCircle,
} from 'lucide-react';
import { Supplier, Product, Purchase, PaymentMethod, UserRole } from '../../types';
import { Modal } from '../../components/common/Modal';

interface PurchasesPageProps {
  suppliers: Supplier[];
  products: Product[];
  currentRole: UserRole;
  onAddSupplier: (supplier: Supplier) => void;
  onAddPurchase: (purchase: Purchase) => void;
}

export const PurchasesPage: React.FC<PurchasesPageProps> = ({
  suppliers,
  products,
  currentRole,
  onAddSupplier,
  onAddPurchase,
}) => {
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    suppliers[0] || null
  );

  // New purchase entry form
  const [invoiceNo, setInvoiceNo] = useState(`CHALAN-${Date.now().toString().slice(-5)}`);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState(suppliers[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [purchaseQty, setPurchaseQty] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(75);
  const [paidNow, setPaidNow] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('নগদ (Cash)');

  // New supplier form
  const [suppCompanyName, setSuppCompanyName] = useState('');
  const [suppContactPerson, setSuppContactPerson] = useState('');
  const [suppPhone, setSuppPhone] = useState('');
  const [suppAddress, setSuppAddress] = useState('');

  const totalSupplierDue = suppliers.reduce(
    (sum, s) => sum + s.outstandingBalance,
    0
  );

  const purchaseTotal = purchaseQty * unitCost;
  const purchaseDue = Math.max(0, purchaseTotal - paidNow);

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppCompanyName) return;

    const newSupplier: Supplier = {
      id: `supp-${Date.now()}`,
      companyName: suppCompanyName,
      contactPerson: suppContactPerson,
      phone: suppPhone,
      address: suppAddress,
      totalSupplied: 0,
      totalPaid: 0,
      outstandingBalance: 0,
      lastPurchaseDate: '২০২৬-১০-২৭',
    };

    onAddSupplier(newSupplier);
    setSelectedSupplier(newSupplier);
    setIsAddSupplierModalOpen(false);
    setSuppCompanyName('');
    setSuppContactPerson('');
    setSuppPhone('');
    setSuppAddress('');
  };

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const supp = suppliers.find((s) => s.id === purchaseSupplierId);
    const prod = products.find((p) => p.id === selectedProductId);
    if (!supp || !prod) return;

    const newPurchase: Purchase = {
      id: `purch-${Date.now()}`,
      invoiceNo,
      supplierId: supp.id,
      supplierName: supp.companyName,
      date: '২০২৬-১০-২৭',
      items: [
        {
          productId: prod.id,
          productName: prod.name,
          unit: prod.unit,
          quantity: purchaseQty,
          costPrice: unitCost,
          total: purchaseTotal,
        },
      ],
      totalAmount: purchaseTotal,
      paidAmount: paidNow,
      dueAmount: purchaseDue,
      paymentMethod: payMethod,
      receivedBy: currentRole === 'owner' ? 'মো. শাহাদাত হোসেন' : 'কামরুল হাসান',
      status: purchaseDue === 0 ? 'received' : 'partial',
    };

    onAddPurchase(newPurchase);
    setIsPurchaseModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            মহাজন ও পণ্য ক্রয় (Purchases & Suppliers)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            সাপ্লায়ার চালান, নতুন মালামাল রিসিভ ও মহাজনের পাওনা রেজিস্টার
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন চালান রিসিভ (ক্রয়)</span>
          </button>
          <button
            onClick={() => setIsAddSupplierModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Building className="w-4 h-4" />
            <span>নতুন মহাজন যোগ</span>
          </button>
        </div>
      </div>

      {/* Accounting Rule Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">সঠিক হিসাবের নিয়ম:</span>{' '}
          পণ্য কেনার সময় পণ্যের চালান রেকর্ড হবে এবং স্টক বাড়বে। পরবর্তীতে মহাজন বা সাপ্লায়ারের বাকি দেনা শোধ করার সময় তা সরাসরি <strong>মহাজন দেনা পরিশোধ</strong> হবে, কোনোভাবেই <strong>পুনরায় খরচ (Expense) হিসেবে ডবল এন্ট্রি হবে না</strong>।
        </div>
      </div>

      {/* Summary Matrix Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500">মোট নিবন্ধিত মহাজন</div>
          <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            {suppliers.length} টি প্রতিষ্ঠান
          </div>
          <div className="text-[11px] text-slate-500 mt-1">চাল, তেল ও অন্যান্য আড়তদার</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500">মোট সরবরাহকৃত পণ্য মূল্য</div>
          <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            ৳{suppliers.reduce((s, x) => s + x.totalSupplied, 0).toLocaleString('bn-BD')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">চলতি অর্থবছরে সর্বমোট চালান</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500">মহাজনের অবশিষ্ট দেনা (বকেয়া)</div>
          <div className="text-xl font-bold text-rose-700 mt-1 tabular-nums">
            ৳{totalSupplierDue.toLocaleString('bn-BD')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">দোকান থেকে প্রদেয় দেনা</div>
        </div>
      </div>

      {/* Suppliers Table & Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Suppliers List (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800">
              মহাজন / সাপ্লায়ারের বিবরণ
            </h2>
            <span className="text-[11px] text-slate-500">ক্লিক করে ইতিহাস দেখুন</span>
          </div>

          <div className="divide-y divide-slate-100">
            {suppliers.map((supp) => {
              const isSelected = selectedSupplier?.id === supp.id;
              return (
                <div
                  key={supp.id}
                  onClick={() => setSelectedSupplier(supp)}
                  className={`p-4 transition-colors cursor-pointer flex items-center justify-between ${
                    isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {supp.companyName}
                    </h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      ব্যক্তি: {supp.contactPerson} · ফোন: {supp.phone}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      ঠিকানা: {supp.address || '—'}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-bold tabular-nums ${
                        supp.outstandingBalance > 0
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {supp.outstandingBalance > 0
                        ? `৳${supp.outstandingBalance} দেনা`
                        : 'দেনা নেই'}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1">
                      শেষ চালান: {supp.lastPurchaseDate}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Supplier Payment & Invoice Placeholder (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {selectedSupplier ? (
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {selectedSupplier.companyName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    যোগাযোগ: {selectedSupplier.contactPerson} ({selectedSupplier.phone})
                  </p>
                </div>
                <button
                  onClick={() => alert('Phase 1 ডেমো: মহাজন পাওনা পরিশোধের ভাউচার এন্ট্রি পরবর্তী ধাপে ডাটাবেসে সেভ হবে।')}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  দেনা পরিশোধ করুন
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500">মোট সাপ্লাইকৃত:</span>
                  <div className="font-bold text-slate-900 tabular-nums">
                    ৳{selectedSupplier.totalSupplied.toLocaleString('bn-BD')}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">বর্তমান বকেয়া দেনা:</span>
                  <div className="font-extrabold text-rose-700 tabular-nums text-sm">
                    ৳{selectedSupplier.outstandingBalance.toLocaleString('bn-BD')}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">
                  সাম্প্রতিক চালান ও পেমেন্ট হিস্ট্রি (ডেমো)
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-800">
                        চালান নং CHALAN-9841
                      </div>
                      <div className="text-[11px] text-slate-500">২০২৬-১০-২৫ · মিনিকেট চাল ২০ বস্তা</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 tabular-nums">৳৭২,০০০</div>
                      <div className="text-[10px] text-emerald-700 font-medium">পরিশোধিত ৳৫২,০০০</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              তালিকা থেকে মহাজন নির্বাচন করুন
            </div>
          )}
        </div>
      </div>

      {/* New Purchase Modal */}
      <Modal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        title="নতুন চালান রিসিভ (পণ্য ক্রয় এন্ট্রি)"
        subtitle="সাপ্লায়ারের কাছ থেকে মাল গ্রহণ ও স্টক বৃদ্ধির ফরম (Phase 1 UI)"
      >
        <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                চালান / ভাউচার নম্বর *
              </label>
              <input
                type="text"
                required
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                মহাজন / সাপ্লায়ার *
              </label>
              <select
                value={purchaseSupplierId}
                onChange={(e) => setPurchaseSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              পণ্য নির্বাচন করুন
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                const p = products.find((x) => x.id === e.target.value);
                if (p) setUnitCost(p.costPrice);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                পরিমাণ *
              </label>
              <input
                type="number"
                min="1"
                required
                value={purchaseQty || ''}
                onChange={(e) => setPurchaseQty(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="পরিমাণ"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                একক ক্রয়দর (টাকা) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={unitCost || ''}
                onChange={(e) => setUnitCost(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="৳ একক দর"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-100 rounded-lg space-y-1">
            <div className="flex justify-between font-bold text-slate-900">
              <span>চালানের মোট বিল:</span>
              <span className="tabular-nums">৳{purchaseTotal}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                তাৎক্ষণিক পরিশোধিত টাকা
              </label>
              <input
                type="number"
                min="0"
                value={paidNow || ''}
                onChange={(e) => setPaidNow(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="৳ যেমন: ৫০০০"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                পেমেন্ট মাধ্যম
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="নগদ (Cash)">নগদ ক্যাশ</option>
                <option value="বিকাশ (bKash)">বিকাশ</option>
                <option value="নগদ (Nagad)">নগদ</option>
                <option value="ব্যাংক / কার্ড (Bank)">ব্যাংক চেক</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsPurchaseModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
            >
              চালান সংরক্ষণ ও স্টক বৃদ্ধি (ডেমো)
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Supplier Modal */}
      <Modal
        isOpen={isAddSupplierModalOpen}
        onClose={() => setIsAddSupplierModalOpen(false)}
        title="নতুন মহাজন / সাপ্লায়ার নিবন্ধন"
        subtitle="সাপ্লায়ারের নাম ও যোগাযোগ সংরক্ষণ (Phase 1 UI)"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              প্রতিষ্ঠানের নাম *
            </label>
            <input
              type="text"
              required
              value={suppCompanyName}
              onChange={(e) => setSuppCompanyName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="যেমন: সিটি ওয়েল ডিস্ট্রিবিউশন"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                যোগাযোগকারী ব্যক্তি
              </label>
              <input
                type="text"
                value={suppContactPerson}
                onChange={(e) => setSuppContactPerson(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="যেমন: হাফিজুর রহমান"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                মোবাইল নম্বর
              </label>
              <input
                type="tel"
                value={suppPhone}
                onChange={(e) => setSuppPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="০১৭১১-XXXXXX"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              আড়তের ঠিকানা
            </label>
            <input
              type="text"
              value={suppAddress}
              onChange={(e) => setSuppAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="যেমন: বাবুবাজার চালের আড়ত, ঢাকা"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddSupplierModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
            >
              সংরক্ষণ করুন (ডেমো)
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
