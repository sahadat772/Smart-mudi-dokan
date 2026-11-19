import React, { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, Check, CheckCircle2, Clock3 } from "lucide-react";
import { apiFetch } from "../../api/client";
import {
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanId,
} from "../../../shared/subscriptionPlans";

type Plan = SubscriptionPlanId;
type BillingCycle = "monthly" | "yearly";
type PaymentMethod = "bkash" | "nagad" | "bank" | "cash";

interface ShopSubscription {
  plan: string;
  status: string;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
}

interface PlanOption {
  plan: Plan;
  cycle: BillingCycle;
  amount: number;
  currency: "BDT";
  available: boolean;
  displayName: string;
  description: string;
  limits: (typeof SUBSCRIPTION_PLANS)[Plan]["limits"];
  features: readonly string[];
}

interface PaymentMethodOption {
  id: PaymentMethod;
  label: string;
  instructions: string;
  available: boolean;
}

interface PaymentRecord {
  id: string;
  plan: Plan;
  billingCycle: BillingCycle;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  status: "pending_review" | "approved" | "rejected" | string;
  rejectionReason?: string;
  createdAt?: string | null;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium" }).format(date);
};

export const SubscriptionBanner: React.FC<{
  forceShow?: boolean;
  isOwner?: boolean;
}> = ({ forceShow = false, isOwner = false }) => {
  const [subscription, setSubscription] = useState<ShopSubscription | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | "">("");
  const [paymentReference, setPaymentReference] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const reloadPaymentHistory = async () => {
    if (!isOwner) return;
    const data = await apiFetch<{ payments: PaymentRecord[] }>(
      "/api/subscriptions/payments",
    );
    setPayments(data.payments || []);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [shopData, planData] = await Promise.all([
          apiFetch<{ shop: ShopSubscription }>("/api/shops/me"),
          apiFetch<{
            plans: PlanOption[];
            paymentMethods: PaymentMethodOption[];
          }>("/api/subscriptions/plans"),
        ]);
        if (!active) return;
        setSubscription(shopData.shop);
        setPlans(planData.plans || []);
        setMethods(planData.paymentMethods || []);
        if (isOwner) {
          const history = await apiFetch<{ payments: PaymentRecord[] }>(
            "/api/subscriptions/payments",
          );
          if (active) setPayments(history.payments || []);
        }
      } catch (loadError) {
        console.error("Failed to load subscription details:", loadError);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [isOwner]);

  const submitManualPayment = async () => {
    if (!selectedPlan || !selectedMethod || isSubmitting) return;
    const pendingRequest = payments.find((payment) => payment.status === "pending_review");
    if (pendingRequest) {
      setError("একটি payment request ইতিমধ্যে admin review-এ আছে।");
      return;
    }
    if (selectedMethod !== "cash" && !paymentReference.trim()) {
      setError("Transaction ID বা payment reference লিখুন।");
      return;
    }

    setError("");
    setMessage("");
    setIsSubmitting(true);
    try {
      const result = await apiFetch<{ message: string }>(
        "/api/subscriptions/manual-payment",
        {
          method: "POST",
          body: JSON.stringify({
            plan: selectedPlan.plan,
            cycle: selectedPlan.cycle,
            method: selectedMethod,
            paymentReference: paymentReference.trim(),
            payerPhone: payerPhone.trim(),
          }),
        },
      );
      setMessage(result.message || "Payment request জমা হয়েছে।");
      setSelectedPlan(null);
      setSelectedMethod("");
      setPaymentReference("");
      setPayerPhone("");
      await reloadPaymentHistory();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Payment request জমা হয়নি। আবার চেষ্টা করুন।",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!subscription) {
    return forceShow ? (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        সাবস্ক্রিপশনের তথ্য লোড হচ্ছে...
      </div>
    ) : null;
  }

  const isTrial = subscription.plan === "trial";
  const endDateValue = isTrial
    ? subscription.trialEndsAt
    : subscription.subscriptionEndsAt;
  const endDateMs = endDateValue ? Date.parse(endDateValue) : Number.NaN;
  const hasEndDate = Number.isFinite(endDateMs);
  const expired = isTrial
    ? !hasEndDate || endDateMs <= Date.now()
    : hasEndDate && endDateMs <= Date.now();
  const daysLeft = hasEndDate
    ? Math.ceil((endDateMs - Date.now()) / 86_400_000)
    : null;
  const inactive = subscription.status !== "active";

  if (
    !forceShow &&
    !inactive &&
    !isTrial &&
    (!hasEndDate || (daysLeft !== null && daysLeft > 7))
  ) {
    return null;
  }

  const getPriceOption = (plan: Plan) =>
    plans.find((option) => option.plan === plan && option.cycle === billingCycle);
  const selectedMethodOption = methods.find((method) => method.id === selectedMethod);
  const pendingPayment = payments.find((payment) => payment.status === "pending_review");

  return (
    <section
      id="subscription-banner"
      aria-label="সাবস্ক্রিপশন"
      className={`mb-4 rounded-xl border p-3 text-xs ${
        inactive || expired
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : "border-amber-200 bg-amber-50 text-amber-950"
      }`}
    >
      <div className="flex items-start gap-3">
        {inactive || expired ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
        ) : (
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        )}
        <div>
          <p className="font-semibold">
            {inactive
              ? "সাবস্ক্রিপশন সক্রিয় নেই"
              : expired
                ? isTrial
                  ? "আপনার ট্রায়াল শেষ হয়েছে"
                  : "আপনার সাবস্ক্রিপশনের মেয়াদ শেষ হয়েছে"
                : isTrial
                  ? `ট্রায়ালের আর ${daysLeft} দিন বাকি`
                  : hasEndDate
                    ? `সাবস্ক্রিপশনের আর ${daysLeft} দিন বাকি`
                    : `${subscription.plan === "pro" ? "Pro" : "Basic"} plan চালু আছে`}
          </p>
          <p className="mt-0.5 opacity-90">
            {inactive || expired
              ? "Plan নির্বাচন করে manual payment request দিন; admin যাচাই করে চালু করবেন।"
              : !hasEndDate
                ? "এই plan-এর নির্দিষ্ট মেয়াদ নেই। Plan পরিবর্তন বা নবায়নের request দিতে পারেন।"
                : "মেয়াদ শেষ হওয়ার আগে manual payment দিয়ে plan নবায়ন করুন।"}
          </p>
        </div>
      </div>

      {isOwner && (
        <div className="mt-3 border-t border-current/10 pt-3">
          {pendingPayment && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-white/80 p-2.5 text-amber-950">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Payment request যাচাইয়ের অপেক্ষায়</p>
                <p>
                  {pendingPayment.plan.toUpperCase()} · {pendingPayment.billingCycle === "monthly" ? "মাসিক" : "বার্ষিক"} · ৳{pendingPayment.amount}
                </p>
              </div>
            </div>
          )}

          {plans.length > 0 ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">আপনার দোকানের জন্য Plan বেছে নিন</p>
                  <p className="mt-1 text-[11px] text-slate-600">দাম Render configuration থেকে এসেছে।</p>
                </div>
                <div className="inline-flex rounded-lg bg-slate-200 p-1" role="group" aria-label="Billing cycle">
                  {(["monthly", "yearly"] as const).map((cycle) => (
                    <button
                      key={cycle}
                      type="button"
                      aria-pressed={billingCycle === cycle}
                      onClick={() => {
                        setBillingCycle(cycle);
                        setSelectedPlan(null);
                        setSelectedMethod("");
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold ${billingCycle === cycle ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600"}`}
                    >
                      {cycle === "monthly" ? "মাসিক" : "বার্ষিক"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-2">
                {(Object.keys(SUBSCRIPTION_PLANS) as Plan[]).map((planId) => {
                  const config = SUBSCRIPTION_PLANS[planId];
                  const option = getPriceOption(planId);
                  const selected = selectedPlan?.plan === planId && selectedPlan.cycle === billingCycle;
                  const limits = [
                    ["দোকান", config.limits.shops],
                    ["Staff (Owner ছাড়া)", config.limits.staff],
                    ["Product", config.limits.products],
                  ] as const;
                  return (
                    <article
                      key={planId}
                      className={`flex flex-col rounded-xl border bg-white p-4 shadow-sm ${selected ? "border-emerald-600 ring-2 ring-emerald-100" : "border-slate-200"}`}
                    >
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{config.displayName}</h3>
                        <p className="mt-1 text-xs text-slate-600">{config.description}</p>
                      </div>
                      <div className="my-4">
                        {option?.available ? (
                          <p className="text-2xl font-extrabold text-slate-950">
                            ৳{option.amount.toLocaleString("bn-BD")}<span className="ml-1 text-xs font-medium text-slate-500">/{billingCycle === "monthly" ? "মাস" : "বছর"}</span>
                          </p>
                        ) : (
                          <p className="text-sm font-semibold text-amber-800">এই মেয়াদের মূল্য নির্ধারিত হয়নি</p>
                        )}
                      </div>
                      <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2 text-center">
                        {limits.map(([label, value]) => (
                          <div key={label}>
                            <p className="text-sm font-bold text-slate-900">{value === null ? "সীমা নেই" : value.toLocaleString("bn-BD")}</p>
                            <p className="mt-0.5 text-[10px] leading-tight text-slate-500">{label}</p>
                          </div>
                        ))}
                      </div>
                      <ul className="mb-4 flex-1 space-y-2">
                        {config.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-xs text-slate-700">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        disabled={!option?.available || Boolean(pendingPayment)}
                        onClick={() => {
                          if (!option?.available) return;
                          setSelectedPlan(option);
                          setSelectedMethod("");
                          setError("");
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50 ${selected ? "bg-emerald-800 text-white" : "border border-emerald-700 text-emerald-800 hover:bg-emerald-50"}`}
                      >
                        {option?.available ? (selected ? "নির্বাচিত" : "এই Plan নিন") : "মূল্য পাওয়া যায়নি"}
                      </button>
                    </article>
                  );
                })}
              </div>

              {selectedPlan && !pendingPayment && (
                <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-white p-3 text-slate-800">
                  <p className="font-semibold">
                    Payment method বেছে নিন · ৳{selectedPlan.amount}
                  </p>
                  {methods.filter((method) => method.available).length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {methods.filter((method) => method.available).map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSelectedMethod(method.id)}
                          className={`rounded-lg border p-2 text-left ${
                            selectedMethod === method.id
                              ? "border-blue-600 bg-blue-50"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span className="font-semibold">{method.label}</span>
                          <span className="mt-1 block whitespace-pre-wrap text-[11px] text-slate-600">
                            {method.instructions}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg bg-amber-50 p-2 text-amber-900">
                      Payment account/instruction এখনো সেট করা হয়নি। Admin-এর সাথে যোগাযোগ করুন।
                    </p>
                  )}

                  {selectedMethod && selectedMethodOption && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {selectedMethod !== "cash" && (
                        <input
                          value={paymentReference}
                          maxLength={120}
                          onChange={(event) => setPaymentReference(event.target.value)}
                          placeholder="Transaction ID / reference"
                          aria-label="Payment transaction reference"
                          className={inputClass}
                        />
                      )}
                      {(selectedMethod === "bkash" || selectedMethod === "nagad") && (
                        <input
                          type="tel"
                          value={payerPhone}
                          maxLength={30}
                          onChange={(event) => setPayerPhone(event.target.value)}
                          placeholder="যে নম্বর থেকে টাকা পাঠিয়েছেন"
                          aria-label="যে নম্বর থেকে টাকা পাঠানো হয়েছে"
                          className={inputClass}
                        />
                      )}
                      <button
                        type="button"
                        disabled={isSubmitting || Boolean(pendingPayment)}
                        onClick={() => void submitManualPayment()}
                        className="rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
                      >
                        {isSubmitting ? "Request পাঠানো হচ্ছে..." : "Admin approval-এর জন্য পাঠান"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="rounded-lg bg-white/80 p-2 text-amber-950">
              Plan-এর দাম এখনো নির্ধারণ করা হয়নি। Admin-এর সাথে যোগাযোগ করুন।
            </p>
          )}

          {message && (
            <p role="status" className="mt-2 rounded-lg bg-emerald-100 p-2 text-emerald-900">
              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />{message}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 rounded-lg bg-white p-2 text-rose-800">
              {error}
            </p>
          )}

          {payments.length > 0 && (
            <div className="mt-4 border-t border-current/10 pt-3">
              <p className="mb-2 font-semibold">Payment request history</p>
              <div className="space-y-2">
                {payments.slice(0, 10).map((payment) => (
                  <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 p-2">
                    <span>{payment.plan.toUpperCase()} · {payment.billingCycle === "monthly" ? "মাসিক" : "বার্ষিক"} · ৳{payment.amount}</span>
                    <span className="font-semibold">
                      {payment.status === "approved" ? "অনুমোদিত" : payment.status === "rejected" ? "বাতিল" : "যাচাই চলছে"}
                      {payment.createdAt ? ` · ${formatDate(payment.createdAt)}` : ""}
                    </span>
                    {payment.rejectionReason && <p className="w-full text-rose-700">কারণ: {payment.rejectionReason}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

