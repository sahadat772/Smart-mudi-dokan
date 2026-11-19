import { adminDb } from "./firebaseAdmin.js";
import {
  isSubscriptionPlanId,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanConfig,
} from "../shared/subscriptionPlans.js";

/** Returns null when the shop is legacy/trial or has no configured plan cap. */
export async function getShopPlanConfig(
  shopId: string,
): Promise<SubscriptionPlanConfig | null> {
  const shopSnap = await adminDb.collection("shops").doc(shopId).get();
  if (!shopSnap.exists) return null;
  const plan = shopSnap.data()?.plan;
  if (!isSubscriptionPlanId(plan)) return null;
  return SUBSCRIPTION_PLANS[plan];
}

