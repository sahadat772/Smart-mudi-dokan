import React, { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Phone,
  Wallet,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Customer, DueCollection, PaymentMethod, UserRole } from "../../types";
import { Modal } from "../../components/common/Modal";
import { apiFetch } from "../../api/client";

interface CustomersPageProps {
  customers: Customer[];
  dueCollections: DueCollection[];
  currentRole: UserRole;
  permissions?: {
    view: boolean;
    manage: boolean;
  };
  onAddCustomer: (customer: Customer) => void;
  onCollectDue: (
    collection: DueCollection,
    updatedCustomer?: Customer,
  ) => void;
  onCollectionsLoaded?: (collections: DueCollection[]) => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  customers,
  dueCollections,
  currentRole,
  permissions,
  onAddCustomer,
  onCollectDue,
  onCollectionsLoaded,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localCollections, setLocalCollections] =
    useState<DueCollection[]>(dueCollections);

  const canManageCustomers =
    currentRole === "owner" || permissions?.manage === true;

  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [initialDue, setInitialDue] = useState<number>(0);

  const [collectionAmount, setCollectionAmount] = useState<number>(0);
  const [collectionMethod, setCollectionMethod] =
    useState<PaymentMethod>("নগদ (Cash)");
  const [collectionNote, setCollectionNote] = useState("");

  useEffect(() => {
    if (!selectedCustomer && customers.length > 0) {
      setSelectedCustomer(customers[0]);
    }
  }, [customers, selectedCustomer]);

  useEffect(() => {
    if (!selectedCustomer) return;

    const load = async () => {
      try {
        const data = await apiFetch<{ collections: DueCollection[] }>(
          `/api/customers/${selectedCustomer.id}/collections`,
        );
        setLocalCollections(data.collections || []);
        onCollectionsLoaded?.(data.collections || []);
      } catch (err) {
        console.error(err);
      }
    };

    void load();
  }, [selectedCustomer?.id]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery),
  );

  const totalOutstandingDue = customers.reduce(
    (sum, c) => sum + c.currentDue,
    0,
  );

  const handleOpenCollectModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCollectionAmount(Math.min(customer.currentDue, customer.currentDue));
    setCollectionNote("বাকি কিস্তি আদায়");
    setError(null);
    setIsCollectModalOpen(true);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!canManageCustomers) {
      setError("আপনার কাস্টমার পরিবর্তন করার অনুমতি নেই।");
      return;
    }
    if (!newCustName.trim() || !newCustPhone.trim()) return;

    setSaving(true);
    try {
      const data = await apiFetch<{ customer: Customer }>("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name: newCustName.trim(),
          phone: newCustPhone.trim(),
          address: newCustAddress.trim(),
          initialDue,
        }),
      });

      onAddCustomer(data.customer);
      setSelectedCustomer(data.customer);
      setIsAddCustomerModalOpen(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustAddress("");
      setInitialDue(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "গ্রাহক যোগ করা যায়নি।");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!canManageCustomers) {
      setError("আপনার Due Collection করার অনুমতি নেই।");
      return;
    }
    if (!selectedCustomer || collectionAmount <= 0) return;

    setSaving(true);
    try {
      const data = await apiFetch<{
        collection: DueCollection;
        customer: Customer;
      }>(`/api/customers/${selectedCustomer.id}/collect-due`, {
        method: "POST",
        body: JSON.stringify({
          amount: collectionAmount,
          paymentMethod: collectionMethod,
          note: collectionNote,
        }),
      });

      onCollectDue(data.collection, data.customer);
      setLocalCollections((prev) => [data.collection, ...prev]);
      setSelectedCustomer(data.customer);
      setIsCollectModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "আদায় সংরক্ষণ করা যায়নি।");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            বাকির খাতা (Customer Due Ledger)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Firestore-এ সংরক্ষিত গ্রাহক বাকি ও আদায় রেকর্ড
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsAddCustomerModalOpen(true);
          }}
          disabled={!canManageCustomers}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন গ্রাহক যোগ করুন</span>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900">
        <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">অ্যাকাউন্টিং নিয়ম:</span> বাকি আদায় ক্যাশে
          জমা হয়, কিন্তু নতুন Sales Revenue হিসেবে গণনা হয় না।
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                গ্রাহক তালিকা ({customers.length})
              </span>
              <span className="text-xs font-bold text-rose-700 tabular-nums">
                মোট বাকি: ৳{totalOutstandingDue.toLocaleString("bn-BD")}
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="নাম বা মোবাইল নম্বর..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                কোনো গ্রাহক নেই
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const isSelected = selectedCustomer?.id === cust.id;
                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomer(cust)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-emerald-50/70 border-r-4 border-r-emerald-600"
                        : "hover:bg-slate-50"
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
                          cust.currentDue > 0
                            ? "text-rose-700"
                            : "text-emerald-700"
                        }`}
                      >
                        {cust.currentDue > 0
                          ? `৳${cust.currentDue} বাকি`
                          : "পরিশোধিত"}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          {selectedCustomer ? (
            <div>
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {selectedCustomer.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    মোবাইল: {selectedCustomer.phone}
                    {selectedCustomer.address
                      ? ` · ${selectedCustomer.address}`
                      : ""}
                  </p>
                </div>

                {selectedCustomer.currentDue > 0 && (
                  <button
                    type="button"
                    onClick={() => handleOpenCollectModal(selectedCustomer)}
                    disabled={!canManageCustomers}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>টাকা আদায় করুন</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 text-center p-3 text-xs">
                <div>
                  <div className="text-slate-500 text-[11px]">মোট ক্রয়</div>
                  <div className="font-bold text-slate-900 tabular-nums mt-0.5">
                    ৳{selectedCustomer.totalPurchased.toLocaleString("bn-BD")}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">মোট পরিশোধ</div>
                  <div className="font-bold text-emerald-800 tabular-nums mt-0.5">
                    ৳{selectedCustomer.totalPaid.toLocaleString("bn-BD")}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">বর্তমান বাকি</div>
                  <div className="font-extrabold text-rose-700 tabular-nums text-sm mt-0.5">
                    ৳{selectedCustomer.currentDue.toLocaleString("bn-BD")}
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>আদায়ের ইতিহাস</span>
                </h3>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 font-medium">তারিখ</th>
                        <th className="px-3 py-2 font-medium">বিবরণ</th>
                        <th className="px-3 py-2 font-medium">মাধ্যম</th>
                        <th className="px-3 py-2 font-medium text-right">
                          আদায়
                        </th>
                        <th className="px-3 py-2 font-medium text-right">
                          বাকি
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {localCollections
                        .filter((c) => c.customerId === selectedCustomer.id)
                        .map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/70">
                            <td className="px-3 py-2.5 tabular-nums text-slate-600">
                              {String(c.date).slice(0, 10)}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-slate-800">
                                বাকি জমা
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
                      {localCollections.filter(
                        (c) => c.customerId === selectedCustomer.id,
                      ).length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-3 py-6 text-center text-slate-400"
                          >
                            এখনো কোনো আদায় নেই
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              বাম পাশ থেকে গ্রাহক নির্বাচন করুন
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        title="নতুন গ্রাহক"
        subtitle="Firestore-এ সংরক্ষিত হবে"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
          {error && (
            <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800">
              {error}
            </div>
          )}
          <div>
            <label className="block font-medium mb-1">নাম *</label>
            <input
              required
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">মোবাইল *</label>
            <input
              required
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">ঠিকানা</label>
            <input
              value={newCustAddress}
              onChange={(e) => setNewCustAddress(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">প্রাথমিক বাকি (ঐচ্ছিক)</label>
            <input
              type="number"
              min={0}
              value={initialDue || ""}
              onChange={(e) => setInitialDue(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-emerald-600 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {saving ? "সংরক্ষণ..." : "সংরক্ষণ করুন"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isCollectModalOpen}
        onClose={() => setIsCollectModalOpen(false)}
        title="বাকি টাকা আদায়"
        subtitle={`গ্রাহক: ${selectedCustomer?.name} · বাকি: ৳${selectedCustomer?.currentDue}`}
      >
        <form onSubmit={handleSaveCollection} className="space-y-4 text-xs">
          {error && (
            <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800">
              {error}
            </div>
          )}
          <div>
            <label className="block font-medium mb-1">আদায়ের পরিমাণ *</label>
            <input
              type="number"
              min={1}
              max={selectedCustomer?.currentDue || 0}
              required
              value={collectionAmount || ""}
              onChange={(e) => setCollectionAmount(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg font-bold"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">মাধ্যম</label>
            <select
              value={collectionMethod}
              onChange={(e) =>
                setCollectionMethod(e.target.value as PaymentMethod)
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="নগদ (Cash)">নগদ (Cash)</option>
              <option value="বিকাশ (bKash)">বিকাশ (bKash)</option>
              <option value="নগদ (Nagad)">নগদ (Nagad)</option>
              <option value="ব্যাংক / কার্ড (Bank)">ব্যাংক</option>
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">নোট</label>
            <input
              value={collectionNote}
              onChange={(e) => setCollectionNote(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-emerald-600 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {saving ? "সংরক্ষণ..." : "আদায় সংরক্ষণ"}
          </button>
        </form>
      </Modal>
    </div>
  );
};
