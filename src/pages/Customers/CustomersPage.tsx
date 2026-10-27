import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Calendar,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  BadgeAlert,
} from 'lucide-react';
import { Customer, DueCollection, PaymentMethod, UserRole } from '../../types';
import { Modal } from '../../components/common/Modal';

interface CustomersPageProps {
  customers: Customer[];
  dueCollections: DueCollection[];
  currentRole: UserRole;
  onAddCustomer: (customer: Customer) => void;
  onCollectDue: (collection: DueCollection) => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  customers,
  dueCollections,
  currentRole,
  onAddCustomer,
  onCollectDue,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    customers[0] || null
  );
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);

  // Add customer form
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [initialDue, setInitialDue] = useState<number>(0);

  // Due collection form
  const [collectionAmount, setCollectionAmount] = useState<number>(0);
  const [collectionMethod, setCollectionMethod] =
    useState<PaymentMethod>('নগদ (Cash)');
  const [collectionNote, setCollectionNote] = useState('');

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const totalOutstandingDue = customers.reduce((sum, c) => sum + c.currentDue, 0);

  const handleOpenCollectModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCollectionAmount(Math.min(1000, customer.currentDue));
    setCollectionNote('বাকি কিস্তি আদায়');
    setIsCollectModalOpen(true);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName) return;

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name: newCustName,
      phone: newCustPhone,
      address: newCustAddress,
      totalPurchased: initialDue,
      totalPaid: 0,
      currentDue: initialDue,
      lastTransactionDate: '২০২৬-১০-২৭',
    };

    onAddCustomer(newCustomer);
    setSelectedCustomer(newCustomer);
    setIsAddCustomerModalOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setInitialDue(0);
  };

  const handleSaveCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || collectionAmount <= 0) return;

    const newCollection: DueCollection = {
      id: `col-${Date.now()}`,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      amount: collectionAmount,
      date: '২০২৬-১০-২৭',
      paymentMethod: collectionMethod,
      note: collectionNote,
      collectedBy:
        currentRole === 'owner' ? 'মো. শাহাদাত হোসেন' : 'কামরুল হাসান',
      previousDue: selectedCustomer.currentDue,
      remainingDue: Math.max(0, selectedCustomer.currentDue - collectionAmount),
    };

    onCollectDue(newCollection);
    setIsCollectModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            বাকির খাতা (Customer Due Ledger)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            দোকানের বিশ্বস্ত নিয়মিত গ্রাহকদের বাকি হিসাব ও আদায় রেজিস্টার
          </p>
        </div>

        <button
          onClick={() => setIsAddCustomerModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন গ্রাহক যোগ করুন</span>
        </button>
      </div>

      {/* Accounting Banner Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900">
        <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">গুরুত্বপূর্ণ অ্যাকাউন্টিং নিয়ম:</span>{' '}
          গ্রাহকের পূর্বের বাকির টাকা আদায় করা হলে তা <strong>ক্যাশ বা মোবাইল ব্যাংকিংয়ে জমা</strong> হবে, কিন্তু কোনোভাবেই <strong>নতুন বিক্রি (Sales Revenue) হিসেবে গণনা করা হবে না</strong>, যাতে বিক্রির সংখ্যা দ্বিগুণ না হয়ে যায়।
        </div>
      </div>

      {/* Grid: Customer Directory & Ledger Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Customer List (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          {/* List Header & Search */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                গ্রাহক তালিকা ({customers.length})
              </span>
              <span className="text-xs font-bold text-rose-700 tabular-nums">
                মোট বাকি: ৳{totalOutstandingDue.toLocaleString('bn-BD')}
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Directory Items */}
          <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
            {filteredCustomers.map((cust) => {
              const isSelected = selectedCustomer?.id === cust.id;
              return (
                <div
                  key={cust.id}
                  onClick={() => setSelectedCustomer(cust)}
                  className={`p-3.5 transition-colors cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-50/70 border-r-4 border-r-emerald-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-xs text-slate-900 truncate">
                      {cust.name}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span className="tabular-nums">{cust.phone}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-xs font-bold tabular-nums ${
                        cust.currentDue > 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {cust.currentDue > 0 ? `৳${cust.currentDue} বাকি` : 'পরিশোধিত'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      শেষ: {cust.lastTransactionDate}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Customer Ledger & Due Collection Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          {selectedCustomer ? (
            <div>
              {/* Profile Bar */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {selectedCustomer.name}
                    </h2>
                    {selectedCustomer.currentDue > 0 && (
                      <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded">
                        বকেয়া রয়েছে
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    মোবাইল: {selectedCustomer.phone} · ঠিকানা: {selectedCustomer.address || 'দোকানের স্থানীয়'}
                  </p>
                </div>

                {selectedCustomer.currentDue > 0 && (
                  <button
                    onClick={() => handleOpenCollectModal(selectedCustomer)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>টাকা আদায় করুন</span>
                  </button>
                )}
              </div>

              {/* Financial Snapshot Matrix */}
              <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 text-center p-3 text-xs bg-white">
                <div>
                  <div className="text-slate-500 text-[11px]">মোট ক্রয়</div>
                  <div className="font-bold text-slate-900 tabular-nums mt-0.5">
                    ৳{selectedCustomer.totalPurchased.toLocaleString('bn-BD')}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">মোট পরিশোধ</div>
                  <div className="font-bold text-emerald-800 tabular-nums mt-0.5">
                    ৳{selectedCustomer.totalPaid.toLocaleString('bn-BD')}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">বর্তমান বাকি</div>
                  <div className="font-extrabold text-rose-700 tabular-nums text-sm mt-0.5">
                    ৳{selectedCustomer.currentDue.toLocaleString('bn-BD')}
                  </div>
                </div>
              </div>

              {/* Transaction & Collection History for this Customer */}
              <div className="p-4 space-y-4">
                <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>আদায় ও বাকির ইতিহাস (Demonstration Record)</span>
                </h3>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 font-medium">তারিখ</th>
                        <th className="px-3 py-2 font-medium">বিবরণ</th>
                        <th className="px-3 py-2 font-medium">মাধ্যম</th>
                        <th className="px-3 py-2 font-medium text-right">আদায়কৃত টাকা</th>
                        <th className="px-3 py-2 font-medium text-right">অবশিষ্ট বাকি</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dueCollections
                        .filter((c) => c.customerId === selectedCustomer.id)
                        .map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/70">
                            <td className="px-3 py-2.5 tabular-nums text-slate-600">
                              {c.date}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-slate-800">
                                বাকি কিস্তি জমা
                              </div>
                              {c.note && (
                                <div className="text-[10px] text-slate-400">
                                  {c.note}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">
                              {c.paymentMethod}
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-emerald-800 tabular-nums">
                              +৳{c.amount}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-slate-700 tabular-nums">
                              ৳{c.remainingDue}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              বাম পাশের তালিকা থেকে গ্রাহক নির্বাচন করুন
            </div>
          )}
        </div>
      </div>

      {/* Payment Collection Modal */}
      <Modal
        isOpen={isCollectModalOpen}
        onClose={() => setIsCollectModalOpen(false)}
        title="বাকি টাকা আদায় করুন"
        subtitle={`গ্রাহক: ${selectedCustomer?.name} (বর্তমান বাকি: ৳${selectedCustomer?.currentDue})`}
      >
        <form onSubmit={handleSaveCollection} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              আদায়ের পরিমাণ (টাকা) *
            </label>
            <input
              type="number"
              min="1"
              max={selectedCustomer?.currentDue || 100000}
              required
              value={collectionAmount || ''}
              onChange={(e) => setCollectionAmount(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-emerald-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="৳ টাকার পরিমাণ"
            />
            {selectedCustomer && (
              <p className="text-[11px] text-slate-500 mt-1">
                পরিশোধের পর অবশিষ্ট বাকি থাকবে: ৳
                {Math.max(0, selectedCustomer.currentDue - collectionAmount)}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              টাকা প্রাপ্তির মাধ্যম
            </label>
            <select
              value={collectionMethod}
              onChange={(e) =>
                setCollectionMethod(e.target.value as PaymentMethod)
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="নগদ (Cash)">নগদ ক্যাশ (Cash)</option>
              <option value="বিকাশ (bKash)">বিকাশ (bKash)</option>
              <option value="নগদ (Nagad)">নগদ (Nagad)</option>
              <option value="ব্যাংক / কার্ড (Bank)">ব্যাংক একাউন্ট</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              মন্তব্য / নোট
            </label>
            <input
              type="text"
              value={collectionNote}
              onChange={(e) => setCollectionNote(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="যেমন: মাসের বেতনের পর নগদ ৫০০ টাকা জমা দিলেন"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsCollectModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
            >
              আদায় সম্পন্ন করুন (ডেমো)
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        title="নতুন গ্রাহক নিবন্ধন"
        subtitle="বাকির খাতায় নতুন গ্রাহকের নাম ও ঠিকানা সংরক্ষণ (Phase 1 UI)"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              গ্রাহকের নাম *
            </label>
            <input
              type="text"
              required
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="যেমন: মো. দেলোয়ার হোসেন"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              মোবাইল নম্বর
            </label>
            <input
              type="tel"
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="০১৭১১-XXXXXX"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              ঠিকানা / পরিচয়
            </label>
            <input
              type="text"
              value={newCustAddress}
              onChange={(e) => setNewCustAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="যেমন: বাড়ি নং ১৫, লেন ২"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              প্রারম্ভিক বাকি (যদি আগের বাকি থাকে)
            </label>
            <input
              type="number"
              min="0"
              value={initialDue || ''}
              onChange={(e) => setInitialDue(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="৳ ০"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddCustomerModalOpen(false)}
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
