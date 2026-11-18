import React, { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { apiFetch } from "../../api/client";

interface ShopSubscription {
  plan: string;
  status: string;
  trialEndsAt?: string | null;
}

export const SubscriptionBanner: React.FC = () => {
  const [subscription, setSubscription] = useState<ShopSubscription | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    void apiFetch<{ shop: ShopSubscription }>("/api/shops/me")
      .then((data) => {
        if (active) setSubscription(data.shop);
      })
      .catch((error) => {
        console.error("Failed to load subscription status:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!subscription) return null;
  const trialEndMs = subscription.trialEndsAt
    ? Date.parse(subscription.trialEndsAt)
    : Number.NaN;
  const isTrial = subscription.plan === "trial";
  const trialExpired =
    isTrial && (!Number.isFinite(trialEndMs) || trialEndMs <= Date.now());
  const daysLeft = Number.isFinite(trialEndMs)
    ? Math.ceil((trialEndMs - Date.now()) / 86_400_000)
    : 0;
  const inactive = subscription.status !== "active";

  if (!inactive && (!isTrial || (!trialExpired && daysLeft > 7))) return null;

  return (
    <div
      role="status"
      className={`mb-4 flex items-start gap-3 rounded-xl border p-3 text-xs ${
        inactive || trialExpired
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : "border-amber-200 bg-amber-50 text-amber-950"
      }`}
    >
      {inactive || trialExpired ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
      ) : (
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
      )}
      <div>
        <p className="font-semibold">
          {inactive
            ? "সাবস্ক্রিপশন সক্রিয় নেই"
            : trialExpired
              ? "আপনার ট্রায়াল শেষ হয়েছে"
              : `ট্রায়ালের আর ${daysLeft} দিন বাকি`}
        </p>
        <p className="mt-0.5 opacity-90">
          {inactive || trialExpired
            ? "তথ্য দেখা যাবে, তবে নতুন পরিবর্তন করতে অ্যাডমিনের সাথে যোগাযোগ করে সাবস্ক্রিপশন চালু করুন।"
            : "সেবা চালু রাখতে ট্রায়াল শেষ হওয়ার আগে অ্যাডমিনের সাথে যোগাযোগ করুন।"}
        </p>
      </div>
    </div>
  );
};
