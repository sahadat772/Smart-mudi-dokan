import React, { useEffect, useState } from "react";
import { Plus, Building, AlertCircle } from "lucide-react";
import {
  Supplier,
  Product,
  Purchase,
  PaymentMethod,
  UserRole,
} from "../../types";
import { Modal } from "../../components/common/Modal";
import { apiFetch } from "../../api/client";

interface PurchasesPageProps {
  suppliers: Supplier[];
  products: Product[];
  currentRole: UserRole;
  permissions?: {
    view: boolean;
    manage: boolean;
  };
  onAddSupplier: (supplier: Supplier) => void;
  onAddPurchase: (
    purchase: Purchase,
    extras?: {
      supplier?: Supplier;
      updatedProduct?: {
        id: string;
        stockQuantity: number;
        costPrice?: number;
      };
    },
  ) => void;
  onUpdateSupplier?: (supplier: Supplier) => void;
  onReloadSuppliers?: () => void;
}

export const PurchasesPage: React.FC<PurchasesPageProps> = ({
  suppliers,
  products,
  currentRole,
  permissions,
  onAddSupplier,
  onAddPurchase,
  onUpdateSupplier,
}) => {
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManagePurchases =
    currentRole === "owner" || permissions?.manage === true;

  const [invoiceNo, setInvoiceNo] = useState(
    `CHALAN-${Date.now().toString().slice(-5)}`,
  );
  const [purchaseSupplierId, setPurchaseSupplierId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [purchaseQty, setPurchaseQty] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [paidNow, setPaidNow] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("নগদ (Cash)");

  const [suppCompanyName, setSuppCompanyName] = useState("");
  const [suppContactPerson, setSuppContactPerson] = useState("");
  const [suppPhone, setSuppPhone] = useState("");
  const [suppAddress, setSuppAddress] = useState("");

  const [payAmount, setPayAmount] = useState(0);
  const [payMethodDue, setPayMethodDue] =
    useState<PaymentMethod>("নগদ (Cash)");
  const [payNote, setPayNote] = useState("");

  useEffect(() => {
    if (!selectedSupplier && suppliers.length > 0) {
      setSelectedSupplier(suppliers[0]);
    }
  }, [suppliers, selectedSupplier]);

  useEffect(() => {
    if (suppliers.length && !purchaseSupplierId) {
      setPurchaseSupplierId(suppliers[0].id);
    }
  }, [suppliers, purchaseSupplierId]);

  useEffect(() => {
    if (products.length && !selectedProductId) {
      setSelectedProductId(products[0].id);
      setUnitCost(products[0].costPrice ?? 0);
    }
  }, [products, selectedProductId]);

  useEffect(() => {
    if (!selectedSupplier) return;
    const load = async () => {
      try {
        const data = await apiFetch<{ purchases: Purchase[] }>(
          `/api/purchases?supplierId=${selectedSupplier.id}&limit=20`,
        );
        setPurchases(data.purchases || []);
      } catch (err) {
        console.error(err);
        setPurchases([]);
      }
    };
    void load();
  }, [selectedSupplier?.id]);

  const totalSupplierDue = suppliers.reduce(
    (sum, s) => sum + s.outstandingBalance,
    0,
  );
  const purchaseTotal = purchaseQty * unitCost;
  const purchaseDue = Math.max(0, purchaseTotal - paidNow);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canManagePurchases || !suppCompanyName.trim()) return;

    setSaving(true);
    try {
      const data = await apiFetch<{ supplier: Supplier }>(
        "/api/purchases/suppliers",
        {
          method: "POST",
          body: JSON.stringify({
            companyName: suppCompanyName.trim(),
            contactPerson: suppContactPerson.trim(),
            phone: suppPhone.trim(),
            address: suppAddress.trim(),
          }),
        },
      );
      onAddSupplier(data.supplier);
      setSelectedSupplier(data.supplier);
      setIsAddSupplierModalOpen(false);
      setSuppCompanyName("");
      setSuppContactPerson("");
      setSuppPhone("");
      setSuppAddress("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "মহাজন যোগ করা যায়নি।");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canManagePurchases) return;

    setSaving(true);
    try {
      const data = await apiFetch<{
        purchase: Purchase;
        supplier: Supplier;
        updatedProduct: {
          id: string;
          stockQuantity: number;
          costPrice?: number;
        };
      }>("/api/purchases", {
        method: "POST",
        body: JSON.stringify({
          invoiceNo,
          supplierId: purchaseSupplierId,
          productId: selectedProductId,
          quantity: purchaseQty,
          costPrice: unitCost,
          paidAmount: paidNow,
          paymentMethod: payMethod,
        }),
      });

      onAddPurchase(data.purchase, {
        supplier: data.supplier,
        updatedProduct: data.updatedProduct,
      });

      if (selectedSupplier?.id === data.supplier.id) {
        setSelectedSupplier(data.supplier);
        setPurchases((prev) => [data.purchase, ...prev]);
      }

      setIsPurchaseModalOpen(false);
      setInvoiceNo(`CHALAN-${Date.now().toString().slice(-5)}`);
      setPaidNow(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ক্রয় সংরক্ষণ করা যায়নি।");
    } finally {
      setSaving(false);
    }
  };

  const handlePayDue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedSupplier || !canManagePurchases) return;

    setSaving(true);
    try {
      const data = await apiFetch<{ supplier: Supplier }>(
        `/api/purchases/suppliers/${selectedSupplier.id}/pay`,
        {
          method: "POST",
          body: JSON.stringify({
            amount: payAmount,
            paymentMethod: payMethodDue,
            note: payNote,
          }),
        },
      );

      onUpdateSupplier?.(data.supplier);
      setSelectedSupplier(data.supplier);
      setIsPayModalOpen(false);
      setPayAmount(0);
      setPayNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "দেনা পরিশোধ ব্যর্থ।");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            মহাজন ও পণ্য ক্রয়
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            চালান রিসিভ, স্টক বৃদ্ধি ও মহাজনের দেনা (Firestore)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsPurchaseModalOpen(true);
            }}
            disabled={!canManagePurchases || suppliers.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            নতুন চালান রিসিভ
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsAddSupplierModalOpen(true);
            }}
            disabled={!canManagePurchases}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            <Building className="w-4 h-4" />
            নতুন মহাজন
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">হিসাব নিয়ম:</span> ক্রয়ে স্টক বাড়ে। মহাজনের
          দেনা পরিশোধ Expense নয় — আলাদা supplier payment।
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500">মোট মহাজন</div>
          <div className="text-xl font-bold mt-1">{suppliers.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500">মোট সাপ্লাই</div>
          <div className="text-xl font-bold mt-1 tabular-nums">
            ৳
            {suppliers
              .reduce((s, x) => s + x.totalSupplied, 0)
              .toLocaleString("bn-BD")}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500">মোট দেনা</div>
          <div className="text-xl font-bold text-rose-700 mt-1 tabular-nums">
            ৳{totalSupplierDue.toLocaleString("bn-BD")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b bg-slate-50 text-xs font-bold">
            মহাজন তালিকা
          </div>
          <div className="divide-y max-h-[520px] overflow-y-auto">
            {suppliers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                কোনো মহাজন নেই — আগে মহাজন যোগ করুন
              </div>
            ) : (
              suppliers.map((supp) => {
                const isSelected = selectedSupplier?.id === supp.id;
                return (
                  <div
                    key={supp.id}
                    onClick={() => setSelectedSupplier(supp)}
                    className={`p-4 cursor-pointer flex justify-between ${
                      isSelected ? "bg-emerald-50/60" : "hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <h3 className="font-bold text-sm">{supp.companyName}</h3>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {supp.contactPerson} · {supp.phone}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          supp.outstandingBalance > 0
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {supp.outstandingBalance > 0
                          ? `৳${supp.outstandingBalance} দেনা`
                          : "দেনা নেই"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
          {selectedSupplier ? (
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between border-b pb-3">
                <div>
                  <h3 className="font-bold text-base">
                    {selectedSupplier.companyName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedSupplier.contactPerson} ({selectedSupplier.phone})
                  </p>
                </div>
                {selectedSupplier.outstandingBalance > 0 && (
                  <button
                    type="button"
                    disabled={!canManagePurchases}
                    onClick={() => {
                      setPayAmount(selectedSupplier.outstandingBalance);
                      setError(null);
                      setIsPayModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                  >
                    দেনা পরিশোধ
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border">
                <div>
                  <span className="text-slate-500">মোট সাপ্লাই:</span>
                  <div className="font-bold tabular-nums">
                    ৳{selectedSupplier.totalSupplied.toLocaleString("bn-BD")}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">বকেয়া দেনা:</span>
                  <div className="font-extrabold text-rose-700 tabular-nums">
                    ৳
                    {selectedSupplier.outstandingBalance.toLocaleString(
                      "bn-BD",
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold mb-2">সাম্প্রতিক চালান</h4>
                <div className="border rounded-lg divide-y text-xs max-h-64 overflow-y-auto">
                  {purchases.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">
                      কোনো চালান নেই
                    </div>
                  ) : (
                    purchases.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-semibold">{p.invoiceNo}</div>
                          <div className="text-[11px] text-slate-500">
                            {String(p.date).slice(0, 10)} ·{" "}
                            {p.items?.[0]?.productName || "পণ্য"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold tabular-nums">
                            ৳{p.totalAmount}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            দেনা ৳{p.dueAmount}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              মহাজন নির্বাচন করুন
            </div>
          )}
        </div>
      </div>

      {/* Add supplier */}
      <Modal
        isOpen={isAddSupplierModalOpen}
        onClose={() => setIsAddSupplierModalOpen(false)}
        title="নতুন মহাজন"
        subtitle="Firestore-এ সংরক্ষিত হবে"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
          {error && (
            <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded">
              {error}
            </div>
          )}
          <input
            required
            placeholder="কোম্পানি / আড়তের নাম *"
            value={suppCompanyName}
            onChange={(e) => setSuppCompanyName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <input
            placeholder="যোগাযোগকারী"
            value={suppContactPerson}
            onChange={(e) => setSuppContactPerson(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <input
            required
            placeholder="ফোন *"
            value={suppPhone}
            onChange={(e) => setSuppPhone(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <input
            placeholder="ঠিকানা"
            value={suppAddress}
            onChange={(e) => setSuppAddress(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-emerald-600 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {saving ? "সংরক্ষণ..." : "সংরক্ষণ"}
          </button>
        </form>
      </Modal>

      {/* Purchase modal */}
      <Modal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        title="নতুন চালান রিসিভ"
        subtitle="স্টক বাড়বে এবং মহাজন দেনা আপডেট হবে"
      >
        <form onSubmit={handleSavePurchase} className="space-y-3 text-xs">
          {error && (
            <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              className="px-3 py-2 border rounded-lg font-mono"
              placeholder="চালান নং"
            />
            <select
              value={purchaseSupplierId}
              onChange={(e) => setPurchaseSupplierId(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.companyName}
                </option>
              ))}
            </select>
          </div>
          <select
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value);
              const p = products.find((x) => x.id === e.target.value);
              if (p) setUnitCost(p.costPrice ?? 0);
            }}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.unit})
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min={1}
              required
              value={purchaseQty || ""}
              onChange={(e) => setPurchaseQty(Number(e.target.value) || 0)}
              className="px-3 py-2 border rounded-lg"
              placeholder="পরিমাণ"
            />
            <input
              type="number"
              min={0}
              required
              value={unitCost || ""}
              onChange={(e) => setUnitCost(Number(e.target.value) || 0)}
              className="px-3 py-2 border rounded-lg"
              placeholder="একক ক্রয়দর"
            />
          </div>
          <div className="p-3 bg-slate-100 rounded-lg font-bold flex justify-between">
            <span>মোট বিল</span>
            <span className="tabular-nums">৳{purchaseTotal}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min={0}
              value={paidNow || ""}
              onChange={(e) => setPaidNow(Number(e.target.value) || 0)}
              className="px-3 py-2 border rounded-lg"
              placeholder="এখন পরিশোধ"
            />
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="নগদ (Cash)">নগদ</option>
              <option value="বিকাশ (bKash)">বিকাশ</option>
              <option value="নগদ (Nagad)">নগদ</option>
              <option value="ব্যাংক / কার্ড (Bank)">ব্যাংক</option>
            </select>
          </div>
          <p className="text-[11px] text-slate-500">
            অবশিষ্ট দেনা: ৳{purchaseDue}
          </p>
          <button
            type="submit"
            disabled={saving || products.length === 0}
            className="w-full py-2 bg-emerald-600 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {saving ? "সংরক্ষণ..." : "ক্রয় সংরক্ষণ"}
          </button>
        </form>
      </Modal>

      {/* Pay due modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="মহাজনের দেনা পরিশোধ"
        subtitle={`${selectedSupplier?.companyName} · দেনা ৳${selectedSupplier?.outstandingBalance}`}
      >
        <form onSubmit={handlePayDue} className="space-y-3 text-xs">
          {error && (
            <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded">
              {error}
            </div>
          )}
          <input
            type="number"
            min={1}
            max={selectedSupplier?.outstandingBalance || 0}
            required
            value={payAmount || ""}
            onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
            className="w-full px-3 py-2 border rounded-lg font-bold"
            placeholder="পরিশোধের পরিমাণ"
          />
          <select
            value={payMethodDue}
            onChange={(e) => setPayMethodDue(e.target.value as PaymentMethod)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="নগদ (Cash)">নগদ</option>
            <option value="বিকাশ (bKash)">বিকাশ</option>
            <option value="নগদ (Nagad)">নগদ</option>
            <option value="ব্যাংক / কার্ড (Bank)">ব্যাংক</option>
          </select>
          <input
            value={payNote}
            onChange={(e) => setPayNote(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="নোট (ঐচ্ছিক)"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-rose-600 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {saving ? "সংরক্ষণ..." : "পরিশোধ সংরক্ষণ"}
          </button>
        </form>
      </Modal>
    </div>
  );
};
