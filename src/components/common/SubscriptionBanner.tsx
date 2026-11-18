import React, { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { apiFetch } from "../../api/client";

type Plan = "basic" | "pro";
type BillingCycle = "monthly" | "yearly";

interface ShopSubscription {
  plan: string;
  status: string;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  phone?: string | null;
  address?: string | null;
}

interface PlanOption {
  plan: Plan;
  cycle: BillingCycle;
  amount: number;
  currency: "BDT";
  available: boolean;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export const SubscriptionBanner: React.FC = () => {
  const [subscription, setSubscription] = useState<ShopSubscription | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [contact, setContact] = useState({
    phone: "",
    address: "",
    city: "",
    postcode: "",
  });
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      apiFetch<{ shop: ShopSubscription }>("/api/shops/me"),
      apiFetch<{ plans: PlanOption[] }>("/api/subscriptions/plans"),
    ])
      .then(([shopData, planData]) => {
        if (!active) return;
        setSubscription(shopData.shop);
        setPlans(planData.plans || []);
        setContact((current) => ({
          ...current,
          phone: shopData.shop.phone || "",
          address: shopData.shop.address || "",
        }));
      })
      .catch((loadError) => {
        console.error("Failed to load subscription details:", loadError);
      });

    return () => {
      active = false;
    };
  }, []);

  const startCheckout = async (option: PlanOption) => {
    if (isCheckingOut) return;
    if (
      !contact.phone.trim() ||
      !contact.address.trim() ||
      !contact.city.trim() ||
      !contact.postcode.trim()
    ) {
      setError("পেমেন্টের জন্য ফোন, ঠিকানা, শহর ও পোস্টকোড পূরণ করুন।");
      return;
    }

    setError("");
    setIsCheckingOut(true);
    try {
      const data = await apiFetch<{ paymentUrl: string }>(
        "/api/subscriptions/checkout",
        {
          method: "POST",
          body: JSON.stringify({
            plan: option.plan,
            cycle: option.cycle,
            ...contact,
          }),
        },
      );
      window.location.assign(data.paymentUrl);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "পেমেন্ট চালু করা যায়নি। আবার চেষ্টা করুন।",
      );
      setIsCheckingOut(false);
    }
  };

  if (!subscription) return null;
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
    !inactive &&
    !isTrial &&
    (!hasEndDate || (daysLeft !== null && daysLeft > 7))
  ) {
    return null;
  }

  const availablePlans = plans.filter((plan) => plan.available);

  return (
    <div
      role="status"
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
                  : `সাবস্ক্রিপশনের আর ${daysLeft} দিন বাকি`}
          </p>
          <p className="mt-0.5 opacity-90">
            {inactive || expired
              ? "তথ্য দেখা যাবে; সেবা চালু রাখতে নিচে একটি plan নিন অথবা অ্যাডমিনের সাথে যোগাযোগ করুন।"
              : "সেবা চালু রাখতে মেয়াদ শেষ হওয়ার আগে plan নবায়ন করুন।"}
          </p>
        </div>
      </div>

      {availablePlans.length > 0 ? (
        <div className="mt-3 border-t border-current/10 pt-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {availablePlans.map((option) => (
              <button
                key={`${option.plan}-${option.cycle}`}
                type="button"
                disabled={isCheckingOut}
                onClick={() => void startCheckout(option)}
                className="rounded-lg border border-emerald-700 bg-emerald-700 px-3 py-2 text-left font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
              >
                {option.plan === "basic" ? "Basic" : "Pro"} ·{" "}
                {option.cycle === "monthly" ? "মাসিক" : "বার্ষিক"} · ৳
                {option.amount}
                {isCheckingOut ? " · অপেক্ষা করুন..." : " · পেমেন্ট করুন"}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="tel"
              maxLength={20}
              value={contact.phone}
              onChange={(event) =>
                setContact((current) => ({ ...current, phone: event.target.value }))
              }
              placeholder="মোবাইল নম্বর"
              aria-label="পেমেন্টের মোবাইল নম্বর"
              className={inputClass}
            />
            <input
              value={contact.address}
              maxLength={50}
              onChange={(event) =>
                setContact((current) => ({ ...current, address: event.target.value }))
              }
              placeholder="ঠিকানা"
              aria-label="পেমেন্টের ঠিকানা"
              className={inputClass}
            />
            <input
              value={contact.city}
              maxLength={50}
              onChange={(event) =>
                setContact((current) => ({ ...current, city: event.target.value }))
              }
              placeholder="শহর"
              aria-label="পেমেন্টের শহর"
              className={inputClass}
            />
            <input
              value={contact.postcode}
              maxLength={10}
              onChange={(event) =>
                setContact((current) => ({
                  ...current,
                  postcode: event.target.value,
                }))
              }
              placeholder="পোস্টকোড"
              aria-label="পেমেন্টের পোস্টকোড"
              className={inputClass}
            />
          </div>
          {error && (
            <p role="alert" className="mt-2 rounded-lg bg-white/80 px-2.5 py-2 text-rose-800">
              {error}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 border-t border-current/10 pt-3 opacity-90">
          অনলাইন পেমেন্ট এখনো চালু হয়নি। plan চালু করতে অ্যাডমিনের সাথে যোগাযোগ করুন।
        </p>
      )}
    </div>
  );
};
