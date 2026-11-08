import React, { useState } from "react";
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  ShoppingCart,
  Users,
  Wallet,
  ArrowUpRight,
  ChevronRight,
  Clock,
  BarChart3,
  Package,
  Receipt,
  CalendarDays,
  ArrowDownRight,
  Store,
  Activity,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

import { Product, Sale, UserRole } from "../../types";
import { NavPageId } from "../../components/layout/Sidebar";

interface DashboardPageProps {
  products: Product[];
  recentSales: Sale[];
  currentRole: UserRole;
  onNavigate: (page: NavPageId) => void;
  onSelectSaleForReceipt: (sale: Sale) => void;
}

interface DailySalesTrend {
  day: string;
  date: string;
  sales: number;
  profit: number;
  orders: number;
  isToday?: boolean;
}

const DEMO_7_DAYS_SALES: DailySalesTrend[] = [
  { day: "বুধ", date: "২১ অক্টো", sales: 4850, profit: 420, orders: 18 },
  { day: "বৃহঃ", date: "২২ অক্টো", sales: 5200, profit: 490, orders: 22 },
  { day: "শুক্র", date: "২৩ অক্টো", sales: 7450, profit: 710, orders: 31 },
  { day: "শনি", date: "২৪ অক্টো", sales: 6100, profit: 560, orders: 25 },
  { day: "রবি", date: "২৫ অক্টো", sales: 4950, profit: 440, orders: 19 },
  { day: "সোম", date: "২৬ অক্টো", sales: 5620, profit: 510, orders: 24 },
  {
    day: "আজ",
    date: "২৭ অক্টো",
    sales: 3085,
    profit: 229,
    orders: 3,
    isToday: true,
  },
];

const money = (amount: number) => `৳${amount.toLocaleString("bn-BD")}`;

export const DashboardPage: React.FC<DashboardPageProps> = ({
  products,
  recentSales,
  currentRole,
  onNavigate,
  onSelectSaleForReceipt,
}) => {
  const [activeMetric, setActiveMetric] = useState<"sales" | "profit">("sales");

  // Demo values: Firebase integration will replace these later.
  const todaySalesRevenue = 3085;
  const todayCOGS = 2856;
  const todayGrossProfit = todaySalesRevenue - todayCOGS;
  const todayExpenses = 3630;
  const estimatedNetProfit = todayGrossProfit - todayExpenses;
  const totalCustomerDue = 10400;

  const lowStockProducts = products.filter(
    (p) => p.stockQuantity <= p.lowStockThreshold,
  );

  const total7DaySales = DEMO_7_DAYS_SALES.reduce(
    (sum, item) => sum + item.sales,
    0,
  );

  const avgDailySales = Math.round(total7DaySales / DEMO_7_DAYS_SALES.length);

  const peakDay = [...DEMO_7_DAYS_SALES].sort((a, b) => b.sales - a.sales)[0];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    const data: DailySalesTrend = payload[0].payload;

    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-white shadow-2xl">
        <p className="mb-2 font-semibold text-slate-300">
          {data.date} · {data.day}
        </p>
        <p className="mb-1 text-emerald-400">বিক্রি: {money(data.sales)}</p>
        <p className="mb-1 text-blue-300">লাভ: {money(data.profit)}</p>
        <p className="text-slate-400">মেমো: {data.orders} টি</p>
      </div>
    );
  };

  const stats = [
    {
      title: "আজকের মোট বিক্রি",
      value: money(todaySalesRevenue),
      subtitle: "আজকের লেনদেন · Demo",
      icon: TrendingUp,
      color: "emerald",
      trend: "Sales Revenue",
    },
    {
      title: "আজকের খরচ",
      value: money(todayExpenses),
      subtitle: "দোকানের পরিচালন খরচ",
      icon: CreditCard,
      color: "rose",
      trend: "Operating Expense",
    },
    {
      title: "মোট লাভ",
      value: money(todayGrossProfit),
      subtitle: "বিক্রি − COGS",
      icon: ArrowUpRight,
      color: "blue",
      trend: "Gross Profit",
    },
    {
      title: "গ্রাহকের মোট বাকি",
      value: money(totalCustomerDue),
      subtitle: "কাস্টমারের অবশিষ্ট বকেয়া",
      icon: Wallet,
      color: "amber",
      trend: "Customer Due",
    },
  ];

  const colorClasses: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    rose: "bg-rose-50 text-rose-600 ring-rose-100",
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
  };

  return (
    <div className="min-h-full space-y-6 pb-8">
      {/* Welcome Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <Activity className="h-3.5 w-3.5" />
              SMART MUDI MANAGER
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              দোকানের ড্যাশবোর্ড
            </h1>

            <p className="mt-2 max-w-xl text-sm text-slate-300">
              আপনার দোকানের বিক্রি, লাভ, স্টক এবং দৈনিক হিসাব এক জায়গায়।
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <CalendarDays className="h-4 w-4" />
              Phase 1 · Demo Data
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onNavigate("pos")}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400"
            >
              <ShoppingCart className="h-4 w-4" />
              নতুন বিক্রি
            </button>

            <button
              onClick={() => onNavigate("customers")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <Users className="h-4 w-4" />
              বাকি আদায়
            </button>

            <button
              onClick={() => onNavigate("expenses")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <Receipt className="h-4 w-4" />
              খরচ এন্ট্রি
            </button>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              ব্যবসার সারসংক্ষেপ
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              আজকের গুরুত্বপূর্ণ হিসাব
            </p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
            Demo Statistics
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {item.title}
                    </p>
                    <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                      {item.value}
                    </h3>
                  </div>

                  <div
                    className={`rounded-2xl p-3 ring-1 ${colorClasses[item.color]}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">
                    {item.subtitle}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {item.trend}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Chart Section */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                বিক্রয় ও লাভের বিশ্লেষণ
              </h2>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              গত ৭ দিনের পারফরম্যান্স · Demo Data
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setActiveMetric("sales")}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                activeMetric === "sales"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              বিক্রি
            </button>
            <button
              onClick={() => setActiveMetric("profit")}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                activeMetric === "profit"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              লাভ
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4">
          <div>
            <p className="text-[11px] text-slate-500">৭ দিনের মোট বিক্রি</p>
            <p className="mt-1 text-sm font-bold text-slate-900 sm:text-lg">
              {money(total7DaySales)}
            </p>
          </div>
          <div className="border-l border-slate-200 pl-3">
            <p className="text-[11px] text-slate-500">দৈনিক গড়</p>
            <p className="mt-1 text-sm font-bold text-slate-900 sm:text-lg">
              {money(avgDailySales)}
            </p>
          </div>
          <div className="border-l border-slate-200 pl-3">
            <p className="text-[11px] text-slate-500">সর্বোচ্চ বিক্রি</p>
            <p className="mt-1 text-sm font-bold text-emerald-700 sm:text-lg">
              {peakDay.day}
            </p>
          </div>
        </div>

        <div className="mt-6 h-64 w-full sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={DEMO_7_DAYS_SALES}
              margin={{ top: 10, right: 5, left: -15, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="day"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `৳${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey={activeMetric} radius={[8, 8, 0, 0]} maxBarSize={52}>
                {DEMO_7_DAYS_SALES.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      activeMetric === "sales"
                        ? entry.isToday
                          ? "#10b981"
                          : "#059669"
                        : entry.isToday
                          ? "#3b82f6"
                          : "#2563eb"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Accounting Summary */}
      {currentRole === "owner" && (
        <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex gap-3">
              <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">
                  ব্যবসার হিসাবের সারাংশ
                </h3>
                <p className="mt-1 text-xs leading-6 text-slate-600">
                  Gross Profit: {money(todayGrossProfit)} · Operating Expense:{" "}
                  {money(todayExpenses)} · Estimated Net:{" "}
                  {money(estimatedNetProfit)}
                </p>
                <p className="text-[11px] text-slate-400">
                  Demo হিসাব; প্রকৃত Net Profit রিপোর্ট Firebase সংযুক্তির পর
                  আসবে।
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate("reports")}
              className="inline-flex items-center gap-1 self-start text-sm font-semibold text-indigo-700 hover:text-indigo-900"
            >
              বিস্তারিত রিপোর্ট
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {/* Low Stock & Recent Sales */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Low Stock */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-slate-900">স্টক সতর্কতা</h3>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              {lowStockProducts.length} টি
            </span>
          </div>

          <div className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto">
            {lowStockProducts.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                <p className="text-sm font-medium text-slate-600">
                  বর্তমানে কোনো পণ্যের স্টক কম নেই
                </p>
              </div>
            ) : (
              lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 p-4 transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {product.category} ·{" "}
                      {product.shelfLocation || "স্থান নির্ধারিত নয়"}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">
                      {product.stockQuantity} {product.unit}
                    </span>
                    <p className="mt-1 text-[10px] text-slate-400">
                      সীমা: {product.lowStockThreshold}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => onNavigate("products")}
            className="flex w-full items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 p-4 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            সকল পণ্য দেখুন
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Recent Sales */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">সাম্প্রতিক বিক্রি</h3>
                <p className="mt-1 text-[11px] text-slate-400">
                  সর্বশেষ বিক্রির তালিকা
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate("pos")}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              POS খুলুন
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">মেমো</th>
                  <th className="px-4 py-3 font-semibold">গ্রাহক</th>
                  <th className="px-4 py-3 text-right font-semibold">পণ্য</th>
                  <th className="px-4 py-3 text-right font-semibold">মোট</th>
                  <th className="px-4 py-3 font-semibold">পেমেন্ট</th>
                  <th className="px-4 py-3 text-right font-semibold">রসিদ</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      এখনো কোনো বিক্রির তথ্য নেই
                    </td>
                  </tr>
                ) : (
                  recentSales.map((sale) => (
                    <tr key={sale.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-4 font-mono font-semibold text-slate-800">
                        {sale.invoiceNo}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-800">
                          {sale.customerName || "সাধারণ ক্রেতা"}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {sale.createdAt}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right text-slate-600">
                        {sale.items.length} টি
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-slate-900">
                        {money(sale.grandTotal)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                          {sale.payments[0]?.method.split(" ")[0] || "নগদ"}
                          {sale.dueAmount > 0 ? " · বাকি" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => onSelectSaleForReceipt(sale)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          দেখুন
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-[11px] text-slate-400">
            সাম্প্রতিক বিক্রির রসিদ দেখতে “দেখুন” বাটনে ক্লিক করুন।
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 pt-4 text-[11px] text-slate-400 sm:flex-row">
        <span className="flex items-center gap-2">
          <Store className="h-3.5 w-3.5" />
          Smart Mudi Manager · Phase 1 Prototype
        </span>
        <span>Dashboard UI · Demo Data</span>
      </div>
    </div>
  );
};
