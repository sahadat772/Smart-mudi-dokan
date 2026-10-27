import React from 'react';
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  ShoppingCart,
  Users,
  Wallet,
  ArrowUpRight,
  ChevronRight,
  PackageCheck,
  Clock,
  Layers,
} from 'lucide-react';
import { Product, Sale, UserRole } from '../../types';
import { NavPageId } from '../../components/layout/Sidebar';

interface DashboardPageProps {
  products: Product[];
  recentSales: Sale[];
  currentRole: UserRole;
  onNavigate: (page: NavPageId) => void;
  onSelectSaleForReceipt: (sale: Sale) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  products,
  recentSales,
  currentRole,
  onNavigate,
  onSelectSaleForReceipt,
}) => {
  // Low stock products
  const lowStockProducts = products.filter(
    (p) => p.stockQuantity <= p.lowStockThreshold
  );

  // Today's demonstration summary numbers
  const todaySalesRevenue = 3085;
  const todayCOGS = 2856;
  const todayGrossProfit = todaySalesRevenue - todayCOGS; // ৳229
  const todayExpenses = 3630; // বিদ্যুৎ bill + transport + tea
  const estimatedNetProfit = todayGrossProfit - todayExpenses; // -3401 (since month-end electricity bill paid today)
  const totalCustomerDue = 10400; // Total customer due across accounts
  const totalSupplierDue = 32000; // Total supplier balance

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            দোকানের ড্যাশবোর্ড
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            আজকের বিক্রয় ও স্টকের সার্বিক সংক্ষিপ্ত চিত্র (ডেমো ডাটা)
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigate('pos')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>নতুন বিক্রি (POS)</span>
          </button>
          <button
            onClick={() => onNavigate('customers')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>বাকি আদায়</span>
          </button>
          <button
            onClick={() => onNavigate('expenses')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            <span>খরচ এন্ট্রি</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">আজকের মোট বিক্রি</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
            ৳{todaySalesRevenue.toLocaleString('bn-BD')}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-emerald-700 font-semibold">৩টি মেমো</span>
            <span>· আজকের লেনদেন (ডেমো)</span>
          </div>
        </div>

        {/* Today's Expenses */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">আজকের খরচ</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
            ৳{todayExpenses.toLocaleString('bn-BD')}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            বিদ্যুৎ, ভ্যান ভাড়া ও নাস্তা
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">
              মোট লাভ (Gross Profit)
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-900 tabular-nums">
            ৳{todayGrossProfit.toLocaleString('bn-BD')}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            বিক্রি বিয়োগ COGS ক্রয়মূল্য
          </div>
        </div>

        {/* Estimated Net Profit (or Customer Due) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">মোট গ্রাহক বাকি</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-800 tabular-nums">
            ৳{totalCustomerDue.toLocaleString('bn-BD')}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            ৪ জন কাস্টমারের অবশিষ্ট বকেয়া
          </div>
        </div>
      </div>

      {/* Accounting Insight Note for Owner */}
      {currentRole === 'owner' && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-800">
                মুদি দোকানের সঠিক হিসাবের মূলনীতি (Phase 1 Guide)
              </div>
              <p className="text-slate-600 text-[11px]">
                বিক্রি থেকে কেবল বিক্রিত পণ্যের ক্রয়মূল্য (COGS ৳{todayCOGS}) বাদ দিলে মোট লাভ (Gross Profit ৳{todayGrossProfit}) পাওয়া যায়। দোকান খরচ (৳{todayExpenses}) বাদ দিলে নিট হিসাব বের হবে।
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('reports')}
            className="text-indigo-700 font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>পূর্ণাঙ্গ রিপোর্ট দেখুন</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Two Column Grid: Low Stock Warnings & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts (1 Col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="font-bold text-sm text-slate-900">
                স্বল্প স্টকের সতর্কতা
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full tabular-nums">
              {lowStockProducts.length} টি পণ্য
            </span>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[360px]">
            {lowStockProducts.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                কোন পণ্যের স্টক কম নেই
              </div>
            ) : (
              lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-xs text-slate-900 truncate">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {p.category} · স্থান: {p.shelfLocation || 'অনির্দিষ্ট'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-xs font-bold tabular-nums border border-rose-200/60">
                      অবশিষ্ট: {p.stockQuantity} {p.unit}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      সর্বনিম্ন সীমা: {p.lowStockThreshold}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200">
            <button
              onClick={() => onNavigate('products')}
              className="w-full py-1.5 text-xs text-center font-medium text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <span>সকল পণ্য ও স্টক তালিকা দেখুন</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Recent Sales Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-sm text-slate-900">
                আজকের সাম্প্রতিক বিক্রি
              </h2>
            </div>
            <button
              onClick={() => onNavigate('pos')}
              className="text-xs text-emerald-700 font-medium hover:underline flex items-center gap-0.5"
            >
              <span>পিওএস-এ যান</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-medium">মেমো নং</th>
                  <th className="px-4 py-2.5 font-medium">গ্রাহক</th>
                  <th className="px-4 py-2.5 font-medium text-right">পণ্য সংখ্যা</th>
                  <th className="px-4 py-2.5 font-medium text-right">মোট টাকা</th>
                  <th className="px-4 py-2.5 font-medium">পেমেন্ট মাধ্যম</th>
                  <th className="px-4 py-2.5 font-medium text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-slate-900">
                      {sale.invoiceNo}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">
                        {sale.customerName || 'সাধারণ ক্রেতা'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {sale.createdAt}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {sale.items.length} টি
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                      ৳{sale.grandTotal}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                        {sale.payments[0]?.method.split(' ')[0] || 'নগদ'}
                        {sale.dueAmount > 0 && ' (বাকি বাকি)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onSelectSaleForReceipt(sale)}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 cursor-pointer"
                      >
                        রসিদ দেখুন
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
            <span className="text-[11px] text-slate-500">
              Phase 1 ডেমো ভিউ · রসিদ বাটনে ক্লিক করে ফুল ফরম্যাট মেমো দেখুন
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
