import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  ArrowUpRight,
  TrendingDown,
  Info,
  DollarSign,
  PieChart,
} from 'lucide-react';
import { UserRole } from '../../types';

interface ReportsPageProps {
  currentRole: UserRole;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ currentRole }) => {
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'monthly'>('daily');

  // Realistic sample financial dataset for Bangladesh grocery store
  const data =
    reportPeriod === 'daily'
      ? {
          periodLabel: 'আজকের রিপোর্ট (২৭ অক্টোবর ২০২৬)',
          salesRevenue: 3085,
          cogs: 2856,
          grossProfit: 229,
          grossMarginPercent: 7.42,
          expenses: 780, // daily recurring expenses (van 600 + tea 180; electricity treated as monthly or allocated)
          netProfit: 229 - 780, // -551 (demonstration of daily timing vs monthly allocation)
          dueSalesIncluded: 800,
          dueCollectedCash: 1000,
          customerTotalDues: 10400,
          supplierTotalDues: 32000,
          totalInvoices: 3,
        }
      : {
          periodLabel: 'চলতি অক্টোবর মাসের সারসংক্ষেপ (১ - ২৭ অক্টোবর ২০২৬)',
          salesRevenue: 184500,
          cogs: 165800,
          grossProfit: 18700,
          grossMarginPercent: 10.13,
          expenses: 8500, // Monthly shop rent + electricity + staff salary share
          netProfit: 10200,
          dueSalesIncluded: 24000,
          dueCollectedCash: 18500,
          customerTotalDues: 10400,
          supplierTotalDues: 32000,
          totalInvoices: 142,
        };

  return (
    <div className="space-y-6">
      {/* Title & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            রিপোর্ট ও লাভ-ক্ষতির বিশ্লেষণ (Financial Reports)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            দোকানের মোট বিক্রি, ক্রয়মূল্য (COGS), পরিচালন ব্যয় ও প্রকৃত লাভ-ক্ষতি
          </p>
        </div>

        {/* Period Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => setReportPeriod('daily')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              reportPeriod === 'daily'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            আজকের রিপোর্ট
          </button>
          <button
            onClick={() => setReportPeriod('monthly')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              reportPeriod === 'monthly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            চলতি মাসের হিসাব
          </button>
        </div>
      </div>

      {/* Mandatory Demo Data Notice */}
      <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">নোট (Phase 1 ডেমো ভিউ):</span>{' '}
          নিচের হিসাব ও সংখ্যাগুলো প্রোটোটাইপ প্রদর্শনীর জন্য প্রদত্ত নমুনা মান (Demonstration Data)। কোনো অবস্থাতেই এগুলো দোকানের প্রকৃত ফাইনান্সিয়াল রেকর্ড নয়। Phase 2-তে ক্লাউড ফায়ারবেস থেকে স্বয়ংক্রিয়ভাবে নির্ভুল ডাটা ক্যালকুলেট করা হবে।
        </div>
      </div>

      {/* Profit & Loss Statement (Core Accounting Architecture) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm text-slate-900">
              লাভ ও ক্ষতি বিবরণী (Income & Profit Statement)
            </h2>
            <p className="text-xs text-slate-500">{data.periodLabel}</p>
          </div>
          <span className="text-[11px] font-medium bg-slate-200/80 px-2 py-0.5 rounded text-slate-700">
            মুদি অ্যাকাউন্টিং ফরম্যাট
          </span>
        </div>

        <div className="p-5 space-y-4 text-xs sm:text-sm">
          {/* Step 1: Sales Revenue */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <div className="font-bold text-slate-900">
                ১. মোট বিক্রয় আয় (Total Sales Revenue)
              </div>
              <p className="text-[11px] text-slate-500">
                কাউন্টার বিক্রি ও বাকিতে পণ্য সরবরাহকৃত সর্বমোট ইনভয়েস মূল্য
              </p>
            </div>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              ৳{data.salesRevenue.toLocaleString('bn-BD')}
            </span>
          </div>

          {/* Step 2: COGS */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100 bg-rose-50/30 px-3 rounded-lg">
            <div>
              <div className="font-bold text-rose-900">
                ২. বাদ: বিক্রিত পণ্যের ক্রয়মূল্য (Cost of Goods Sold - COGS)
              </div>
              <p className="text-[11px] text-slate-500">
                যে পণ্যগুলো বিক্রি হয়েছে তাদের প্রকৃত পাইকারি ক্রয়দর
              </p>
            </div>
            <span className="text-base font-bold text-rose-800 tabular-nums">
              - ৳{data.cogs.toLocaleString('bn-BD')}
            </span>
          </div>

          {/* Step 3: Gross Profit */}
          <div className="flex items-center justify-between py-2.5 px-3 bg-blue-50/70 border border-blue-200 rounded-lg">
            <div>
              <div className="font-bold text-blue-950 text-sm">
                ৩. মোট লাভ (Gross Profit = বিক্রি - ক্রয়মূল্য)
              </div>
              <p className="text-[11px] text-blue-800">
                দোকানের পণ্য বিক্রির গ্রস মার্জিন: {data.grossMarginPercent}%
              </p>
            </div>
            <span className="text-lg font-extrabold text-blue-900 tabular-nums">
              ৳{data.grossProfit.toLocaleString('bn-BD')}
            </span>
          </div>

          {/* Step 4: Operating Expenses */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100 bg-amber-50/30 px-3 rounded-lg">
            <div>
              <div className="font-bold text-amber-950">
                ৪. বাদ: দোকানের পরিচালন ব্যয় (Operating Expenses)
              </div>
              <p className="text-[11px] text-slate-500">
                ভাড়া, বিদ্যুৎ, কর্মচারীর বেতন, পরিবহন ও আনুষঙ্গিক খরচ
              </p>
            </div>
            <span className="text-base font-bold text-amber-800 tabular-nums">
              - ৳{data.expenses.toLocaleString('bn-BD')}
            </span>
          </div>

          {/* Step 5: Net Profit */}
          <div
            className={`flex items-center justify-between p-3.5 rounded-xl border ${
              data.netProfit >= 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div>
              <div className="font-extrabold text-base">
                ৫. প্রকৃত নিট লাভ (Estimated Net Profit)
              </div>
              <p className="text-[11px] opacity-80">
                {data.netProfit >= 0
                  ? 'দোকানের সকল খরচ বাদ দেওয়ার পর চূড়ান্ত নিট উদ্বৃত্ত'
                  : 'খরচের পরিমাণ সাময়িকভাবে বেশি থাকায় নিট ব্যবধান'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl font-black tabular-nums">
                ৳{data.netProfit.toLocaleString('bn-BD')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dues & Balance Sheet Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Dues */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-900">
              গ্রাহকদের কাছে বর্তমান মোট বাকি (Accounts Receivable)
            </h3>
            <span className="text-[11px] text-rose-700 font-bold tabular-nums">
              ৳{data.customerTotalDues.toLocaleString('bn-BD')}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            এটি দোকানের সম্পদ (Asset)। যখন কাস্টমার এই বাকি টাকা পরিশোধ করবেন, তখন নগদ ক্যাশ বাড়বে কিন্তু নতুন বিক্রি বা লাভ হিসেবে ধরা হবে না।
          </p>
        </div>

        {/* Supplier Dues */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-900">
              মহাজনদের কাছে বর্তমান মোট দেনা (Accounts Payable)
            </h3>
            <span className="text-[11px] text-rose-700 font-bold tabular-nums">
              ৳{data.supplierTotalDues.toLocaleString('bn-BD')}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            এটি দোকানের দায় (Liability)। পণ্য কেনার সময় তা স্টকে যোগ হয়েছে। পরবর্তীতে টাকা দিলে তা সরাসরি দেনা কমাবে, দ্বিতীয়বার খরচ হবে না।
          </p>
        </div>
      </div>
    </div>
  );
};
