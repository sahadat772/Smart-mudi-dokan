import React, { useState } from "react";
import {
  Landmark,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Smartphone,
  Scale,
  CheckCircle,
} from "lucide-react";
import { CashSession, UserRole } from "../../types";
import { apiFetch } from "../../api/client";

interface CashManagementPageProps {
  cashSession: CashSession;
  currentRole: UserRole;
  permissions: {
    view: boolean;
    manage: boolean;
  };
  onUpdateActualCash: (amount: number) => void;
  onSessionUpdated?: (session: CashSession) => void;
  onReload?: () => void;
}

export const CashManagementPage: React.FC<CashManagementPageProps> = ({
  cashSession,
  currentRole,
  permissions,
  onUpdateActualCash,
  onSessionUpdated,
  onReload,
}) => {
  const [actualCashInput, setActualCashInput] = useState<number>(
    cashSession.actualClosingCash ?? cashSession.expectedClosingCash,
  );
  const [openingInput, setOpeningInput] = useState<number>(
    cashSession.openingCash,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const discrepancy = actualCashInput - cashSession.expectedClosingCash;
  const canManageCash = currentRole === "owner" || permissions?.manage === true;
  const isClosed = cashSession.isClosed === true;

  const handleSaveOpening = async () => {
    if (!canManageCash || isClosed) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const data = await apiFetch<{ session: CashSession }>("/api/cash/today", {
        method: "PATCH",
        body: JSON.stringify({ openingCash: openingInput }),
      });
      onSessionUpdated?.(data.session);
      setMessage("প্রারম্ভিক ক্যাশ আপডেট হয়েছে।");
    } catch (err) {
      setError(err instanceof Error ? err.message : "আপডেট ব্যর্থ।");
    } finally {
      setSaving(false);
    }
  };

  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageCash || isClosed) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const data = await apiFetch<{ session: CashSession }>(
        "/api/cash/today/close",
        {
          method: "POST",
          body: JSON.stringify({ actualClosingCash: actualCashInput }),
        },
      );
      onSessionUpdated?.(data.session);
      onUpdateActualCash(actualCashInput);
      setMessage("আজকের ক্যাশ ক্লোজিং সম্পন্ন হয়েছে।");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ক্লোজ ব্যর্থ।");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            ক্যাশ ও ক্যাশবক্স ব্যবস্থাপনা
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            আজকের নগদ হিসাব Firestore থেকে — বিক্রি/বাকি/খরচ স্বয়ংক্রিয়
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onReload && (
            <button
              type="button"
              onClick={() => onReload()}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              রিফ্রেশ
            </button>
          )}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{cashSession.date}</span>
            {isClosed && <span className="text-rose-700">· বন্ধ</span>}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900">
          {error}
        </div>
      )}
      {message && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">প্রত্যাশিত ক্যাশ</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold tabular-nums">
            ৳{cashSession.expectedClosingCash.toLocaleString("bn-BD")}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">বিকাশ</span>
            <Smartphone className="w-4 h-4 text-pink-600" />
          </div>
          <div className="text-xl font-bold text-pink-900 tabular-nums">
            ৳{cashSession.bKashBalance.toLocaleString("bn-BD")}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">নগদ</span>
            <Smartphone className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-900 tabular-nums">
            ৳{cashSession.nagadBalance.toLocaleString("bn-BD")}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">ব্যাংক</span>
            <Landmark className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-blue-900 tabular-nums">
            ৳{cashSession.bankBalance.toLocaleString("bn-BD")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b bg-slate-50 text-xs font-bold">
            আজকের ক্যাশ ফ্লো
          </div>
          <div className="p-5 space-y-3 text-xs">
            <div className="flex justify-between p-2.5 rounded-lg bg-slate-50 border">
              <span className="font-semibold">প্রারম্ভিক ক্যাশ</span>
              <span className="font-bold tabular-nums">
                +৳{cashSession.openingCash.toLocaleString("bn-BD")}
              </span>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold">নগদ বিক্রি</span>
              </div>
              <span className="font-bold text-emerald-800 tabular-nums">
                +৳{cashSession.cashSales.toLocaleString("bn-BD")}
              </span>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-blue-50/60 border border-blue-200">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-blue-600" />
                <span className="font-semibold">বাকি আদায়</span>
              </div>
              <span className="font-bold text-blue-800 tabular-nums">
                +৳{cashSession.cashDueCollected.toLocaleString("bn-BD")}
              </span>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-rose-50/60 border border-rose-200">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span className="font-semibold">খরচ</span>
              </div>
              <span className="font-bold text-rose-800 tabular-nums">
                -৳{cashSession.cashExpenses.toLocaleString("bn-BD")}
              </span>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-amber-50/60 border border-amber-200">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-amber-600" />
                <span className="font-semibold">মহাজন পরিশোধ</span>
              </div>
              <span className="font-bold text-amber-800 tabular-nums">
                -৳{cashSession.cashSupplierPaid.toLocaleString("bn-BD")}
              </span>
            </div>
            <div className="pt-3 border-t flex justify-between font-bold bg-slate-100 p-3 rounded-lg">
              <span>প্রত্যাশিত সমাপনী</span>
              <span className="text-emerald-700 tabular-nums">
                ৳{cashSession.expectedClosingCash.toLocaleString("bn-BD")}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b bg-slate-50 flex items-center gap-2 text-xs font-bold">
            <Scale className="w-4 h-4 text-indigo-600" />
            ক্যাশ ক্লোজিং
          </div>

          <div className="p-5 space-y-4 text-xs">
            {!isClosed && canManageCash && (
              <div className="space-y-2">
                <label className="font-medium text-slate-700">প্রারম্ভিক ক্যাশ</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    value={openingInput || ""}
                    onChange={(e) => setOpeningInput(Number(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 border rounded-lg font-bold"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSaveOpening()}
                    className="px-3 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-50"
                  >
                    সেভ
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleReconcile} className="space-y-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  গুণে পাওয়া প্রকৃত টাকা *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={actualCashInput || ""}
                  disabled={!canManageCash || isClosed}
                  onChange={(e) =>
                    setActualCashInput(Number(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base font-bold disabled:bg-slate-100"
                />
              </div>

              <div
                className={`p-3 rounded-lg border text-xs ${
                  discrepancy === 0
                    ? "bg-emerald-50 border-emerald-200"
                    : discrepancy > 0
                      ? "bg-blue-50 border-blue-200"
                      : "bg-rose-50 border-rose-200"
                }`}
              >
                <div className="font-semibold">
                  {discrepancy === 0
                    ? "মিলেছে"
                    : discrepancy > 0
                      ? `অতিরিক্ত +৳${discrepancy}`
                      : `কম ৳${discrepancy}`}
                </div>
              </div>

              {isClosed ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-900">
                  <CheckCircle className="w-4 h-4" />
                  আজকের ক্যাশ ক্লোজ করা আছে
                  {cashSession.actualClosingCash != null &&
                    ` · প্রকৃত ৳${cashSession.actualClosingCash}`}
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={!canManageCash || saving}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  {saving ? "সংরক্ষণ..." : "দৈনিক ক্যাশ ক্লোজ করুন"}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
