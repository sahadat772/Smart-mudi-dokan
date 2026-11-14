import React from "react";
import { Menu, Store, AlertTriangle, LogOut, Shield, User } from "lucide-react";
import { UserRole } from "../../types";

interface TopbarProps {
  currentRole: UserRole;
  displayName?: string;
  onLogout: () => void;
  onOpenMobileMenu: () => void;
  lowStockCount: number;
  onNavigateToLowStock: () => void;
  shopName: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentRole,
  displayName,
  onLogout,
  onOpenMobileMenu,
  lowStockCount,
  onNavigateToLowStock,
  shopName,
}) => {
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Store className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-slate-900 sm:text-base">
              {shopName}
            </p>
            <p className="hidden truncate text-[11px] text-slate-500 sm:block">
              স্মার্ট মুদি ম্যানেজার
            </p>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
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
