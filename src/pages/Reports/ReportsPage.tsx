import React, { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { UserRole } from "../../types";
import { apiFetch } from "../../api/client";

interface ReportSummary {
  period: "daily" | "monthly";
  periodLabel: string;
  salesRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  expenses: number;
  netProfit: number;
  dueSalesIncluded: number;
  dueCollectedCash: number;
  customerTotalDues: number;
  supplierTotalDues: number;
  totalInvoices: number;
  topProducts?: {
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }[];
}

interface ReportsPageProps {
  currentRole: UserRole;
  permissions: {
    view: boolean;
    manage: boolean;
  };
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  currentRole,
  permissions,
}) => {
  const [reportPeriod, setReportPeriod] = useState<"daily" | "monthly">(
    "daily",
  );
  const [data, setData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canViewReports = currentRole === "owner" || permissions?.view === true;

  useEffect(() => {
    if (!canViewReports) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<{ report: ReportSummary }>(
          `/api/reports/summary?period=${reportPeriod}`,
        );
        setData(res.report);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "রিপোর্ট লোড করা যায়নি।",
        );
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [reportPeriod, canViewReports]);

  if (!canViewReports) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <h2 className="text-lg font-bold text-slate-900">Access Denied</h2>
        <p className="text-sm text-slate-500 mt-2">
          আপনার এই রিপোর্ট দেখার অনুমতি নেই।
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            রিপোর্ট ও লাভ-ক্ষতির বিশ্লেষণ
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Firestore থেকে স্বয়ংক্রিয় হিসাব — বিক্রি, COGS, খরচ ও নিট লাভ
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setReportPeriod("daily")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              reportPeriod === "daily"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            আজকের রিপোর্ট
          </button>
          <button
            type="button"
            onClick={() => setReportPeriod("monthly")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              reportPeriod === "monthly"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            চলতি মাসের হিসাব
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900">
        <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          সংখ্যাগুলো এখন লাইভ ডেটা থেকে আসে। বাকি আদায় নতুন বিক্রি নয় — শুধু
          ক্যাশ বাড়ায়।
        </div>
      </div>

      {loading && (
        <div className="text-center text-sm text-slate-500 py-8">
          রিপোর্ট তৈরি হচ্ছে...
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900">
          {error}
        </div>
      )}

      {!loading && data && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm text-slate-900">
                  লাভ ও ক্ষতি বিবরণী
                </h2>
                <p className="text-xs text-slate-500">{data.periodLabel}</p>
              </div>
              <span className="text-[11px] font-medium bg-slate-200/80 px-2 py-0.5 rounded text-slate-700">
                {data.totalInvoices} টি ইনভয়েস
              </span>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <div className="font-bold text-slate-900">
                    ১. মোট বিক্রয় আয়
                  </div>
                  <p className="text-[11px] text-slate-500">
                    বাকিসহ সর্বমোট ইনভয়েস
                  </p>
                </div>
                <span className="text-base font-bold tabular-nums">
                  ৳{data.salesRevenue.toLocaleString("bn-BD")}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100 bg-rose-50/30 px-3 rounded-lg">
                <div>
                  <div className="font-bold text-rose-900">
                    ২. বাদ: COGS (ক্রয়মূল্য)
                  </div>
                </div>
                <span className="text-base font-bold text-rose-800 tabular-nums">
                  - ৳{data.cogs.toLocaleString("bn-BD")}
                </span>
              </div>

              <div className="flex items-center justify-between py-2.5 px-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                <div>
                  <div className="font-bold text-blue-950 text-sm">
                    ৩. মোট লাভ (Gross Profit)
                  </div>
                  <p className="text-[11px] text-blue-800">
                    মার্জিন: {data.grossMarginPercent}%
                  </p>
                </div>
                <span className="text-lg font-extrabold text-blue-900 tabular-nums">
                  ৳{data.grossProfit.toLocaleString("bn-BD")}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100 bg-amber-50/30 px-3 rounded-lg">
                <div>
                  <div className="font-bold text-amber-950">
                    ৪. বাদ: পরিচালন ব্যয়
                  </div>
                </div>
                <span className="text-base font-bold text-amber-800 tabular-nums">
                  - ৳{data.expenses.toLocaleString("bn-BD")}
                </span>
              </div>

              <div
                className={`flex items-center justify-between p-3.5 rounded-xl border ${
                  data.netProfit >= 0
                    ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                    : "bg-rose-50 border-rose-300 text-rose-950"
                }`}
              >
                <div className="font-extrabold text-base">৫. নিট লাভ</div>
                <span className="text-xl font-black tabular-nums">
                  ৳{data.netProfit.toLocaleString("bn-BD")}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900">
                  গ্রাহক মোট বাকি
                </h3>
                <span className="text-[11px] text-rose-700 font-bold tabular-nums">
                  ৳{data.customerTotalDues.toLocaleString("bn-BD")}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                এই পিরিয়ডে বাকি আদায়: ৳
                {data.dueCollectedCash.toLocaleString("bn-BD")}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900">
                  মহাজন মোট দেনা
                </h3>
                <span className="text-[11px] text-rose-700 font-bold tabular-nums">
                  ৳{data.supplierTotalDues.toLocaleString("bn-BD")}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                এই পিরিয়ডে বাকি বিক্রি: ৳
                {data.dueSalesIncluded.toLocaleString("bn-BD")}
              </p>
            </div>
          </div>

          {data.topProducts && data.topProducts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b bg-slate-50 text-xs font-bold">
                সেরা পণ্য (রেভিনিউ অনুযায়ী)
              </div>
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">পণ্য</th>
                    <th className="px-4 py-2 text-right font-medium">পরিমাণ</th>
                    <th className="px-4 py-2 text-right font-medium">বিক্রি</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.topProducts.map((p) => (
                    <tr key={p.productId}>
                      <td className="px-4 py-2 font-medium">{p.name}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {p.quantity}
                      </td>
                      <td className="px-4 py-2 text-right font-bold tabular-nums">
                        ৳{p.revenue.toLocaleString("bn-BD")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
