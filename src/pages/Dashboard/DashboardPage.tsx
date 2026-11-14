import React, { useEffect, useMemo, useState } from "react";
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
import { apiFetch } from "../../api/client";

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

interface DashboardPayload {
  date: string;
  canViewProfit: boolean;
  today: {
    salesRevenue: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
    invoices: number;
    customerTotalDues: number;
  };
  trend: DailySalesTrend[];
}

const money = (amount: number) => `৳${amount.toLocaleString("bn-BD")}`;

export const DashboardPage: React.FC<DashboardPageProps> = ({
  products,
  recentSales,
  currentRole,
  onNavigate,
  onSelectSaleForReceipt,
}) => {
  const [activeMetric, setActiveMetric] = useState<"sales" | "profit">("sales");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<{ dashboard: DashboardPayload }>(
          "/api/dashboard",
        );
        if (!cancelled) setData(res.dashboard);
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : "ড্যাশবোর্ড লোড হয়নি।");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const today = data?.today;
  const trend = data?.trend ?? [];
  const canViewProfit = data?.canViewProfit === true && currentRole === "owner";

  const lowStockProducts = products.filter(
    (p) => p.stockQuantity <= p.lowStockThreshold,
  );

  const total7DaySales = trend.reduce((sum, item) => sum + item.sales, 0);
  const avgDailySales = trend.length
    ? Math.round(total7DaySales / trend.length)
    : 0;
  const peakDay = useMemo(() => {
    if (!trend.length) return null;
    return [...trend].sort((a, b) => b.sales - a.sales)[0];
  }, [trend]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point: DailySalesTrend = payload[0].payload;

    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-white shadow-2xl">
        <p className="mb-2 font-semibold text-slate-300">
          {point.date} · {point.day}
        </p>
        <p className="mb-1 text-emerald-400">বিক্রি: {money(point.sales)}</p>
        {canViewProfit && (
          <p className="mb-1 text-blue-300">লাভ: {money(point.profit)}</p>
        )}
        <p className="text-slate-400">মেমো: {point.orders} টি</p>
      </div>
    );
  };

  const stats = [
    {
      title: "আজকের মোট বিক্রি",
      value: money(today?.salesRevenue ?? 0),
      subtitle: `${today?.invoices ?? 0} টি মেমো`,
      icon: TrendingUp,
      color: "emerald",
      trend: "Sales",
    },
    canViewProfit
      ? {
          title: "আজকের খরচ",
          value: money(today?.expenses ?? 0),
          subtitle: "পরিচালন খরচ",
          icon: CreditCard,
          color: "rose",
          trend: "Expense",
        }
      : {
          title: "আজকের মেমো",
          value: String(today?.invoices ?? 0),
          subtitle: "আজকের বিক্রির সংখ্যা",
          icon: Receipt,
          color: "rose",
          trend: "Invoices",
        },
    canViewProfit
      ? {
          title: "মোট লাভ",
          value: money(today?.grossProfit ?? 0),
          subtitle: "বিক্রি − COGS",
          icon: ArrowUpRight,
          color: "blue",
          trend: "Gross Profit",
        }
      : {
          title: "গ্রাহকের মোট বাকি",
          value: money(today?.customerTotalDues ?? 0),
          subtitle: "অবশিষ্ট বকেয়া",
          icon: Wallet,
          color: "amber",
          trend: "Due",
        },
    {
      title: canViewProfit ? "গ্রাহকের মোট বাকি" : "লো স্টক",
      value: canViewProfit
        ? money(today?.customerTotalDues ?? 0)
        : String(lowStockProducts.length),
      subtitle: canViewProfit ? "অবশিষ্ট বকেয়া" : "সতর্কতার নিচে পণ্য",
      icon: canViewProfit ? Wallet : AlertTriangle,
      color: "amber",
      trend: canViewProfit ? "Customer Due" : "Stock",
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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
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
              আজকের বিক্রি, খরচ, লাভ এবং বাকি Firestore থেকে আসে।
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <CalendarDays className="h-4 w-4" />
              {data?.date || "আজ"} · লাইভ হিসাব
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate("pos")}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white"
            >
              <ShoppingCart className="h-4 w-4" />
              নতুন বিক্রি
            </button>
            <button
              type="button"
              onClick={() => onNavigate("customers")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white"
            >
              <Users className="h-4 w-4" />
              বাকি আদায়
            </button>
            <button
              type="button"
              onClick={() => onNavigate("expenses")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white"
            >
              <Receipt className="h-4 w-4" />
              খরচ এন্ট্রি
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
          {error}
        </div>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">ব্যবসার সারসংক্ষেপ</h2>
            <p className="mt-1 text-xs text-slate-500">
              {loading ? "হিসাব লোড হচ্ছে..." : "আজকের গুরুত্বপূর্ণ হিসাব"}
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
            Live
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{item.title}</p>
                    <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                      {loading ? "..." : item.value}
                    </h3>
                  </div>
                  <div className={`rounded-2xl p-3 ring-1 ${colorClasses[item.color]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  {item.subtitle}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">বিক্রয় ও লাভের বিশ্লেষণ</h2>
            </div>
            <p className="mt-2 text-xs text-slate-500">গত ৭ দিন · লাইভ ডেটা</p>
          </div>
          {canViewProfit && (
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setActiveMetric("sales")}
                className={`rounded-lg px-4 py-2 text-xs font-semibold ${
                  activeMetric === "sales"
                    ? "bg-emerald-600 text-white shadow"
                    : "text-slate-600"
                }`}
              >
                বিক্রি
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric("profit")}
                className={`rounded-lg px-4 py-2 text-xs font-semibold ${
                  activeMetric === "profit"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-600"
                }`}
              >
                লাভ
              </button>
            </div>
          )}
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
              {peakDay?.day || "—"}
            </p>
          </div>
        </div>

        <div className="mt-6 h-64 w-full sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => `৳${value}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey={canViewProfit ? activeMetric : "sales"}
                radius={[8, 8, 0, 0]}
                maxBarSize={52}
              >
                {trend.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      !canViewProfit || activeMetric === "sales"
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

      {canViewProfit && today && (
        <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex gap-3">
              <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">আজকের হিসাব</h3>
                <p className="mt-1 text-xs leading-6 text-slate-600">
                  Gross Profit: {money(today.grossProfit)} · Expense: {money(today.expenses)} · Net: {money(today.netProfit)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("reports")}
              className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700"
            >
              বিস্তারিত রিপোর্ট
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
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
                <div key={product.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{product.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{product.category}</p>
                  </div>
                  <span className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">
                    {product.stockQuantity} {product.unit}
                  </span>
                </div>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={() => onNavigate("products")}
            className="flex w-full items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 p-4 text-xs font-semibold text-emerald-700"
          >
            সকল পণ্য দেখুন
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                <Clock className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-slate-900">সাম্প্রতিক বিক্রি</h3>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {recentSales.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">এখনো কোনো বিক্রি নেই।</p>
            ) : (
              recentSales.slice(0, 8).map((sale) => (
                <button
                  key={sale.id}
                  type="button"
                  onClick={() => onSelectSaleForReceipt(sale)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {sale.invoiceNo || sale.id}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {sale.customerName || "ক্যাশ কাস্টমার"}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    {money(sale.grandTotal || 0)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
