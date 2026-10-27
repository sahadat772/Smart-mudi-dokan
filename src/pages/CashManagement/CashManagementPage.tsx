import React, { useState } from 'react';
import {
  Landmark,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Scale,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { CashSession, UserRole } from '../../types';

interface CashManagementPageProps {
  cashSession: CashSession;
  currentRole: UserRole;
  onUpdateActualCash: (amount: number) => void;
}

export const CashManagementPage: React.FC<CashManagementPageProps> = ({
  cashSession,
  currentRole,
  onUpdateActualCash,
}) => {
  const [actualCashInput, setActualCashInput] = useState<number>(
    cashSession.actualClosingCash || cashSession.expectedClosingCash
  );
  const [isReconciled, setIsReconciled] = useState(false);

  const discrepancy = actualCashInput - cashSession.expectedClosingCash;

  const handleReconcile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateActualCash(actualCashInput);
    setIsReconciled(true);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            ক্যাশ ও ক্যাশবক্স ব্যবস্থাপনা (Cash & Accounts)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            দোকানের দৈনিক নগদ ক্যাশবক্স ক্লোজিং, ড্রয়ার হিসাব ও ডিজিটাল ব্যালেন্স
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>তারিখ: {cashSession.date}</span>
        </div>
      </div>

      {/* Account Balances Grid (Cash, bKash, Nagad, Bank) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Physical Cash Drawer */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">ক্যাশ ড্রয়ার (নগদ)</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 tabular-nums">
            ৳{cashSession.expectedClosingCash.toLocaleString('bn-BD')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">দোকানের ক্যাশবক্সে থাকার কথা</div>
        </div>

        {/* bKash Merchant / Personal Account */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">বিকাশ (bKash)</span>
            <span className="p-1.5 rounded-lg bg-pink-50 text-pink-600">
              <Smartphone className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-pink-900 tabular-nums">
            ৳{cashSession.bKashBalance.toLocaleString('bn-BD')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">০১৭১১-XXXXXX (মার্চেন্ট)</div>
        </div>

        {/* Nagad Account */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">নগদ (Nagad)</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Smartphone className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-amber-900 tabular-nums">
            ৳{cashSession.nagadBalance.toLocaleString('bn-BD')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">০১৮২২-XXXXXX (উদ্যোক্তা)</div>
        </div>

        {/* Bank Account */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">ব্যাংক একাউন্ট</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Landmark className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-blue-900 tabular-nums">
            ৳{cashSession.bankBalance.toLocaleString('bn-BD')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">ইসলামী ব্যাংক (চলতি হিসাব)</div>
        </div>
      </div>

      {/* Cash Flow Reconciliation Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cash In & Out Ledger (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-xs text-slate-900">
              আজকের ক্যাশ ড্রয়ার হিসাব (Cash Flow Equation)
            </h2>
            <span className="text-[11px] text-slate-500">স্বয়ংক্রিয় ব্যালেন্স শিট</span>
          </div>

          <div className="p-5 space-y-3 text-xs">
            {/* Opening Cash */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="font-semibold text-slate-800">
                  সকালের প্রারম্ভিক ক্যাশ (Opening Cash)
                </span>
              </div>
              <span className="font-bold text-slate-900 tabular-nums">
                +৳{cashSession.openingCash.toLocaleString('bn-BD')}
              </span>
            </div>

            {/* Cash Inflow from Sales */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-semibold text-emerald-950">
                    আজকের সরাসরি নগদ বিক্রি
                  </span>
                  <div className="text-[10px] text-emerald-700">POS সেলস থেকে ড্রয়ারে প্রাপ্ত</div>
                </div>
              </div>
              <span className="font-bold text-emerald-800 tabular-nums">
                +৳{cashSession.cashSales.toLocaleString('bn-BD')}
              </span>
            </div>

            {/* Cash Inflow from Customer Due Collection */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/60 border border-blue-200">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-blue-600" />
                <div>
                  <span className="font-semibold text-blue-950">
                    গ্রাহকদের আগের বাকি আদায় (Cash In)
                  </span>
                  <div className="text-[10px] text-blue-700">বাকি খাতা থেকে নগদে প্রাপ্ত</div>
                </div>
              </div>
              <span className="font-bold text-blue-800 tabular-nums">
                +৳{cashSession.cashDueCollected.toLocaleString('bn-BD')}
              </span>
            </div>

            {/* Cash Outflow for Expenses */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/60 border border-rose-200">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <div>
                  <span className="font-semibold text-rose-950">
                    ক্যাশ ড্রয়ার থেকে দোকানের খরচ (Cash Out)
                  </span>
                  <div className="text-[10px] text-rose-700">ভ্যান ভাড়া ও চা আপ্যায়ন</div>
                </div>
              </div>
              <span className="font-bold text-rose-800 tabular-nums">
                -৳{cashSession.cashExpenses.toLocaleString('bn-BD')}
              </span>
            </div>

            {/* Cash Outflow for Suppliers */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/60 border border-amber-200">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-amber-600" />
                <div>
                  <span className="font-semibold text-amber-950">
                    মহাজন / সাপ্লায়ারকে নগদ পরিশোধ
                  </span>
                  <div className="text-[10px] text-amber-700">চালান বা বকেয়া বাবদ</div>
                </div>
              </div>
              <span className="font-bold text-amber-800 tabular-nums">
                -৳{cashSession.cashSupplierPaid.toLocaleString('bn-BD')}
              </span>
            </div>

            {/* Expected Closing Balance */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-sm font-bold bg-slate-100 p-3 rounded-lg">
              <span className="text-slate-900">
                প্রত্যাশিত সমাপনী ক্যাশ (Expected Closing Balance)
              </span>
              <span className="text-emerald-700 tabular-nums text-base">
                ৳{cashSession.expectedClosingCash.toLocaleString('bn-BD')}
              </span>
            </div>
          </div>
        </div>

        {/* Daily Cash Closing & Reconciliation Form (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-600" />
            <h2 className="font-bold text-xs text-slate-900">
              রাত ৯:০০ টায় ক্যাশ ক্লোজিং ও মিলকরণ
            </h2>
          </div>

          <div className="p-5 space-y-4 text-xs">
            <p className="text-slate-600 text-[11px] leading-relaxed">
              দোকান বন্ধ করার সময় ক্যাশবক্সের প্রকৃত নোট ও কয়েন গুণে নিচে লিখুন। সিস্টেম স্বয়ংক্রিয়ভাবে প্রত্যাশিত ক্যাশের সাথে তুলনা করে অমিল (Discrepancy) যাচাই করবে।
            </p>

            <form onSubmit={handleReconcile} className="space-y-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  ক্যাশবক্সে গুণে পাওয়া প্রকৃত টাকা *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-bold">
                    ৳
                  </span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={actualCashInput || ''}
                    onChange={(e) => setActualCashInput(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Discrepancy indicator */}
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  discrepancy === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : discrepancy > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div>
                  <span className="font-semibold block">
                    {discrepancy === 0
                      ? 'ক্যাশ সম্পূর্ণ মিলেছে (Perfect Match)'
                      : discrepancy > 0
                      ? 'ক্যাশবক্সে অতিরিক্ত টাকা রয়েছে (Surplus)'
                      : 'ক্যাশবক্সে টাকা কম রয়েছে (Shortage)'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    প্রত্যাশিত: ৳{cashSession.expectedClosingCash} বনাম প্রকৃত: ৳{actualCashInput}
                  </span>
                </div>
                <span className="font-bold tabular-nums text-sm">
                  {discrepancy > 0 ? `+৳${discrepancy}` : `৳${discrepancy}`}
                </span>
              </div>

              {isReconciled && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">
                    আজকের ক্যাশ ক্লোজিং রেকর্ড আপডেট করা হয়েছে (Phase 1 ডেমো)।
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>দৈনিক ক্যাশ হিসাব ক্লোজ করুন</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
