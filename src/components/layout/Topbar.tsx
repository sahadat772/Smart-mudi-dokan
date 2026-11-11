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
  const label =
    displayName ||
    (currentRole === "owner" ? "দোকান মালিক" : "কর্মচারী");

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="মেনু খুলুন"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 text-base leading-tight tracking-tight">
              {shopName}
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline-block">
              স্মার্ট মুদি ম্যানেজার · POS & Shop Management
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {lowStockCount > 0 && (
          <button
            onClick={onNavigateToLowStock}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-xs font-medium transition-colors"
            title="স্বল্প স্টকের পণ্য দেখুন"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">স্বল্প স্টক:</span>
            <span className="font-bold tabular-nums bg-amber-200/80 px-1.5 py-0.2 rounded text-[11px]">
              {lowStockCount}
            </span>
          </button>
        )}

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700">
          {currentRole === "owner" ? (
            <Shield className="w-3.5 h-3.5 text-emerald-700" />
          ) : (
            <User className="w-3.5 h-3.5 text-blue-700" />
          )}
          <span className="font-medium">
            {currentRole === "owner" ? "মালিক" : "কর্মচারী"}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
            {label.slice(0, 1)}
          </div>
          <div className="text-left text-xs">
            <div className="font-semibold text-slate-800 leading-none">{label}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {currentRole === "owner"
                ? "দোকান মালিক (Admin)"
                : "কর্মচারী অ্যাকাউন্ট"}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
          title="লগআউট"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">লগআউট</span>
        </button>
      </div>
    </header>
  );
};
