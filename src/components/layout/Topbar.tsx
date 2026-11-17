import React, { useState } from "react";
import { Menu, AlertTriangle, Bell, LogOut, Shield, User } from "lucide-react";
import { UserRole } from "../../types";

interface TopbarProps {
  currentRole: UserRole;
  displayName?: string;
  onLogout: () => void;
  onOpenMobileMenu: () => void;
  lowStockCount: number;
  onNavigateToLowStock: () => void;
  dueCustomerCount: number;
  onNavigateToDues: () => void;
  shopName: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentRole,
  displayName,
  onLogout,
  onOpenMobileMenu,
  lowStockCount,
  onNavigateToLowStock,
  dueCustomerCount,
  onNavigateToDues,
  shopName,
}) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationCount = lowStockCount + dueCustomerCount;
  const label = displayName || (currentRole === "owner" ? "দোকান মালিক" : "কর্মচারী");
  const initial = label.trim().slice(0, 1) || "ম";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="-ml-1 rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="মেনু খুলুন"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src="/logo.svg"
            alt="Smart Mudi"
            className="h-9 w-9 shrink-0 rounded-xl bg-white shadow-sm ring-1 ring-slate-200"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-slate-900 sm:text-base">
              {shopName}
            </p>
            <p className="hidden truncate text-[11px] text-slate-500 sm:block">
              Smart Mudi Manager
            </p>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((open) => !open)}
            aria-label={notificationCount ? `নোটিফিকেশন: ${notificationCount}টি` : "নোটিফিকেশন"}
            aria-expanded={notificationsOpen}
            className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
          >
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-600 px-1 text-center text-[9px] font-bold leading-4 text-white">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <p className="px-2 py-1.5 text-xs font-bold text-slate-800">নোটিফিকেশন</p>
              {notificationCount === 0 ? (
                <p className="px-2 py-3 text-xs text-slate-500">এখন কোনো সতর্কতা নেই।</p>
              ) : (
                <div className="space-y-1">
                  {lowStockCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        onNavigateToLowStock();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-amber-900 hover:bg-amber-50"
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span><strong>{lowStockCount}</strong>টি পণ্যের স্টক কম</span>
                    </button>
                  )}
                  {dueCustomerCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        onNavigateToDues();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-rose-900 hover:bg-rose-50"
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-100 font-bold text-rose-700">৳</span>
                      <span><strong>{dueCustomerCount}</strong>জন গ্রাহকের বকেয়া আছে</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {lowStockCount > 0 && (
          <button
            type="button"
            onClick={onNavigateToLowStock}
            className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">স্টক কম</span>
            <span className="rounded-full bg-amber-200 px-1.5 text-[11px] font-bold tabular-nums">
              {lowStockCount}
            </span>
          </button>
        )}

        <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3 sm:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
            {initial}
          </div>
          <div className="leading-tight">
            <p className="max-w-[140px] truncate text-xs font-semibold text-slate-800">{label}</p>
            <p className="flex items-center gap-1 text-[10px] text-slate-500">
              {currentRole === "owner" ? (
                <Shield className="h-3 w-3 text-emerald-700" />
              ) : (
                <User className="h-3 w-3 text-blue-700" />
              )}
              {currentRole === "owner" ? "মালিক" : "কর্মচারী"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">লগআউট</span>
        </button>
      </div>
    </header>
  );
};
