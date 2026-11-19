import React, { useCallback, useEffect, useState } from "react";
import { Check, LoaderCircle, RefreshCw, X } from "lucide-react";
import { apiFetch } from "../../api/client";

type PaymentRequest = {
  id: string;
  shopId: string;
  shopName: string;
  ownerName: string;
  ownerEmail: string;
  ownerUid: string;
  plan: "basic" | "pro";
  billingCycle: "monthly" | "yearly";
  amount: number;
  paymentMethod: "bkash" | "nagad" | "bank" | "cash";
  paymentReference: string;
  payerPhone: string;
  createdAt: string | null;
};

const methodLabels: Record<PaymentRequest["paymentMethod"], string> = {
  bkash: "বিকাশ",
  nagad: "নগদ",
  bank: "ব্যাংক ট্রান্সফার",
  cash: "নগদ টাকা",
};

const dateLabel = (value: string | null) => {
  if (!value) return "সময় পাওয়া যায়নি";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "সময় পাওয়া যায়নি"
    : new Intl.DateTimeFormat("bn-BD", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
};

export const ManualPaymentsPage: React.FC = () => {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ requests: PaymentRequest[] }>(
        "/api/subscriptions/admin/manual-payments",
      );
      setRequests(data.requests || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Request তালিকা লোড করা যায়নি।",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const review = async (request: PaymentRequest, action: "approve" | "reject") => {
    if (busyId) return;
    if (
      action === "approve" &&
      !window.confirm(`${request.shopName} · ৳${request.amount} payment approve করবেন?`)
    ) {
      return;
    }
    const reason =
      action === "reject"
        ? window.prompt("Reject করার কারণ লিখুন (ঐচ্ছিক):") || ""
        : "";
    setBusyId(request.id);
    setError("");
    setNotice("");
    try {
      await apiFetch(`/api/subscriptions/admin/manual-payments/${request.id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setNotice(
        action === "approve"
          ? "Payment approve হয়েছে এবং plan চালু হয়েছে।"
          : "Payment request reject করা হয়েছে।",
      );
      await reload();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Payment request update করা যায়নি।",
      );
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Manual subscription payments</h2>
          <p className="mt-1 text-xs text-slate-600">
            টাকা Nagad/bKash/bank/cash-এ পেয়েছ কি না যাচাই করে তারপর approve করুন।
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
        শুধু payment reference দেখে approve করবেন না। bKash/Nagad/bank app বা cash receipt-এ টাকা পাওয়া যাচাই করুন।
      </p>
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Request লোড হচ্ছে...
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          এখন কোনো pending payment request নেই।
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <article key={request.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{request.shopName}</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    {request.ownerName || request.ownerEmail} · {request.ownerEmail}
                  </p>
                  <p className="text-[11px] text-slate-500">Shop: {request.shopId} · Owner UID: {request.ownerUid}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-right text-emerald-900">
                  <p className="text-base font-bold">৳{request.amount}</p>
                  <p className="text-[11px]">{request.plan.toUpperCase()} · {request.billingCycle === "monthly" ? "মাসিক" : "বার্ষিক"}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-700 sm:grid-cols-2">
                <p>পদ্ধতি: <strong>{methodLabels[request.paymentMethod] || request.paymentMethod}</strong></p>
                <p>সময়: {dateLabel(request.createdAt)}</p>
                <p>Reference: <strong>{request.paymentReference || "—"}</strong></p>
                <p>Sender: {request.payerPhone || "—"}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === request.id}
                  onClick={() => void review(request, "approve")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {busyId === request.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Approve & activate
                </button>
                <button
                  type="button"
                  disabled={busyId === request.id}
                  onClick={() => void review(request, "reject")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

