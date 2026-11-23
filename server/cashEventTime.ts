import { Timestamp } from "firebase-admin/firestore";
import type { Request } from "express";
import { getDhakaDateKey } from "./dateUtils.js";

export type CashEventTime = {
  date: string;
  timestamp: Timestamp;
};

const requestEventTimes = new WeakMap<Request, CashEventTime>();

export function captureCashEventTime(req: Request): CashEventTime {
  const existing = requestEventTimes.get(req);
  if (existing) return existing;

  const clock = req.app.locals.cashEventClock as (() => Date) | undefined;
  const instant = clock ? clock() : new Date();

  if (!(instant instanceof Date) || !Number.isFinite(instant.getTime())) {
    throw new Error("Cash event clock must return a valid Date.");
  }

  const eventTime = {
    date: getDhakaDateKey(instant),
    timestamp: Timestamp.fromDate(instant),
  };
  requestEventTimes.set(req, eventTime);
  return eventTime;
}
