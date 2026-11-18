import { Router } from "express";
import { verifyUser, type AuthenticatedRequest } from "./authMiddleware.js";

const router = Router();
const requestTimes = new Map<string, number[]>();
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;

const SYSTEM_INSTRUCTION = `You are the in-app instructor for Smart Mudi Manager, a grocery shop POS app used in Bangladesh.
Help users understand how to use the app. Explain workflows simply, preferably in Bengali when the user writes Bengali.
The app includes dashboard, POS sales, decimal quantities for kg products (for example 100g = 0.1kg), products and stock, customers and due collection, purchases and suppliers, expenses, cash sessions, reports, staff permissions, shop settings, and receipt printing.
Do not claim you can see or change the user's shop data. Do not calculate or disclose sales, profit, inventory, customer balances, staff data, or other shop-specific/private information. Guide them to the relevant page to view that data.
Never ask for passwords, API keys, payment credentials, or personal customer information. Do not perform actions or promise that an action has been completed.
For questions outside app usage, briefly say you can help with Smart Mudi Manager workflows and suggest the relevant page when possible. Keep answers concise, clear, and actionable.`;

function checkRateLimit(uid: string) {
  const now = Date.now();
  const recent = (requestTimes.get(uid) || []).filter(
    (timestamp) => now - timestamp < RATE_WINDOW_MS,
  );

  if (recent.length >= RATE_LIMIT) {
    requestTimes.set(uid, recent);
    return false;
  }

  recent.push(now);
  requestTimes.set(uid, recent);
  return true;
}

router.post("/", verifyUser, async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.uid;
  if (!uid) {
    return res.status(401).json({
      success: false,
      message: "লগইন করে আবার চেষ্টা করুন।",
    });
  }

  if (!checkRateLimit(uid)) {
    return res.status(429).json({
      success: false,
      message: "এক মিনিটে সর্বোচ্চ ১২টি প্রশ্ন করা যাবে। একটু পরে চেষ্টা করুন।",
    });
  }

  const body = req.body || {};
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 1000) {
    return res.status(400).json({
      success: false,
      message: "প্রশ্ন লিখুন (সর্বোচ্চ ১০০০ অক্ষর)।",
    });
  }

  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (item: any) =>
            (item?.role === "user" || item?.role === "assistant") &&
            typeof item?.text === "string",
        )
        .slice(-8)
        .map((item: any) => ({
          role: item.role === "user" ? "ব্যবহারকারী" : "সহকারী",
          text: item.text.slice(0, 1000),
        }))
    : [];

  const conversation = [
    ...history.map((item: { role: string; text: string }) => `[${item.role}]: ${item.text}`),
    `[ব্যবহারকারী]: ${message}`,
  ].join("\n");

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      message: "AI সহকারী চালু করতে সার্ভারে GEMINI_API_KEY সেট করতে হবে।",
    });
  }

  try {
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          model,
          system_instruction: SYSTEM_INSTRUCTION,
          input: conversation,
          generation_config: { max_output_tokens: 600 },
        }),
        signal: AbortSignal.timeout(25_000),
      },
    );

    if (!response.ok) {
      console.error("Assistant provider returned status:", response.status);
      return res.status(502).json({
        success: false,
        message: "সহকারী এখন উত্তর দিতে পারছে না। একটু পরে আবার চেষ্টা করুন।",
      });
    }

    const result = (await response.json()) as { output_text?: unknown };
    const reply =
      typeof result.output_text === "string" ? result.output_text.trim() : "";

    if (!reply) {
      return res.status(502).json({
        success: false,
        message: "সহকারীর উত্তর পাওয়া যায়নি। আবার চেষ্টা করুন।",
      });
    }

    return res.json({ success: true, reply });
  } catch (error) {
    console.error(
      "Assistant request failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return res.status(502).json({
      success: false,
      message: "সহকারীর সাথে সংযোগ করা যায়নি। একটু পরে আবার চেষ্টা করুন।",
    });
  }
});

export default router;
