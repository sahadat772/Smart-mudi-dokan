import React, { useState } from "react";
import {
  Receipt,
  Plus,
  Filter,
  Building2,
  Zap,
  Users,
  Truck,
  Coffee,
  ShoppingBag,
} from "lucide-react";
import { Expense, ExpenseCategory, PaymentMethod, UserRole } from "../../types";
import { Modal } from "../../components/common/Modal";
import { apiFetch } from "../../api/client";

interface ExpensesPageProps {
  expenses: Expense[];
  currentRole: UserRole;
  permissions?: {
    view: boolean;
    manage: boolean;
  };
  onAddExpense: (expense: Expense) => void;
  onReload?: () => void;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({
  expenses,
  currentRole,
  permissions,
  onAddExpense,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManageExpenses =
    currentRole === "owner" || permissions?.manage === true;

  const today = new Date().toISOString().slice(0, 10);

  const [formData, setFormData] = useState({
    category: "বিদ্যুৎ বিল" as ExpenseCategory,
    title: "",
    amount: 0,
    date: today,
    paymentMethod: "নগদ (Cash)" as PaymentMethod,
    note: "",
  });

  const categories: ExpenseCategory[] = [
    "দোকান ভাড়া",
    "বিদ্যুৎ বিল",
    "কর্মচারীর বেতন",
    "মালামাল পরিবহন",
    "দোকান রক্ষণাবেক্ষণ",
    "চা ও আপ্যায়ন",
    "প্যাকেজিং ও ব্যাগ",
    "অন্যান্য খরচ",
  ];

  const filteredExpenses = expenses.filter(
    (e) => selectedCategory === "all" || e.category === selectedCategory,
  );

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canManageExpenses) return;
    if (!formData.title || formData.amount <= 0) return;

    setSaving(true);
    try {
      const data = await apiFetch<{ expense: Expense }>("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          category: formData.category,
          title: formData.title.trim(),
          amount: formData.amount,
          date: formData.date,
          paymentMethod: formData.paymentMethod,
          note: formData.note.trim(),
        }),
      });

      onAddExpense(data.expense);
      setIsModalOpen(false);
      setFormData({
        category: "দোকান রক্ষণাবেক্ষণ",
        title: "",
        amount: 0,
        date: today,
        paymentMethod: "নগদ (Cash)",
        note: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "খরচ সংরক্ষণ করা যায়নি।");
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (cat: ExpenseCategory) => {
    switch (cat) {
      case "দোকান ভাড়া":
        return <Building2 className="w-4 h-4 text-purple-600" />;
      case "বিদ্যুৎ বিল":
        return <Zap className="w-4 h-4 text-amber-600" />;
      case "কর্মচারীর বেতন":
        return <Users className="w-4 h-4 text-blue-600" />;
      case "মালামাল পরিবহন":
        return <Truck className="w-4 h-4 text-emerald-600" />;
      case "চা ও আপ্যায়ন":
        return <Coffee className="w-4 h-4 text-rose-600" />;
      case "প্যাকেজিং ও ব্যাগ":
        return <ShoppingBag className="w-4 h-4 text-cyan-600" />;
      default:
        return <Receipt className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            দোকানের খরচের হিসাব (Expenses)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ভাড়া, বিদ্যুৎ, বেতন ও দৈনন্দিন খরচ — Firestore-এ সংরক্ষিত
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsModalOpen(true);
          }}
          disabled={!canManageExpenses}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন খরচ লিখুন</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500">মোট খরচ</div>
          <div className="text-xl font-bold text-rose-700 mt-1 tabular-nums">
            ৳{totalExpenseAmount.toLocaleString("bn-BD")}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {expenses.length} টি ভাউচার
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500">নগদ ক্যাশে পরিশোধিত</div>
          <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            ৳
            {expenses
              .filter((e) => e.paymentMethod === "নগদ (Cash)")
              .reduce((s, e) => s + e.amount, 0)
              .toLocaleString("bn-BD")}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500">বিকাশ / ব্যাংক</div>
          <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            ৳
            {expenses
              .filter((e) => e.paymentMethod !== "নগদ (Cash)")
              .reduce((s, e) => s + e.amount, 0)
              .toLocaleString("bn-BD")}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">
              ক্যাটাগরি:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs py-1.5 px-2 bg-white border border-slate-300 rounded-lg"
            >
              <option value="all">সব ({expenses.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-slate-500">
            দেখানো: {filteredExpenses.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">তারিখ</th>
                <th className="px-4 py-3 font-medium">খাত</th>
                <th className="px-4 py-3 font-medium">বিবরণ</th>
                <th className="px-4 py-3 font-medium">মাধ্যম</th>
                <th className="px-4 py-3 font-medium">এন্ট্রি</th>
                <th className="px-4 py-3 font-medium text-right">পরিমাণ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    কোনো খরচ নেই
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-slate-600 tabular-nums">
                      {String(exp.date).slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(exp.category)}
                        <span className="font-semibold text-slate-900">
                          {exp.category}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{exp.title}</div>
                      {exp.note && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {exp.note}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                        {exp.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {exp.recordedBy}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-700 tabular-nums">
                      ৳{exp.amount.toLocaleString("bn-BD")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="নতুন খরচের এন্ট্রি"
        subtitle="Firestore-এ সংরক্ষিত হবে"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                ক্যাটাগরি *
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as ExpenseCategory,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                তারিখ *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              শিরোনাম *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
              placeholder="যেমন: ভ্যান ভাড়া"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                পরিমাণ *
              </label>
              <input
                type="number"
                min={1}
                required
                value={formData.amount || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-rose-700"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                মাধ্যম
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    paymentMethod: e.target.value as PaymentMethod,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="নগদ (Cash)">নগদ</option>
                <option value="বিকাশ (bKash)">বিকাশ</option>
                <option value="নগদ (Nagad)">নগদ</option>
                <option value="ব্যাংক / কার্ড (Bank)">ব্যাংক</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">নোট</label>
            <input
              type="text"
              value={formData.note}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
              placeholder="ভাউচার রেফারেন্স"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={!canManageExpenses || saving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              {saving ? "সংরক্ষণ..." : "খরচ লিপিবদ্ধ করুন"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
