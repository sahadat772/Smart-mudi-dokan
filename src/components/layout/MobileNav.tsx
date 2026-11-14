import React from "react";
import { LayoutDashboard, ShoppingCart, Package, BookOpen, Menu } from "lucide-react";
import { NavPageId } from "./Sidebar";

interface MobileNavProps {
  currentPage: NavPageId;
  onNavigate: (page: NavPageId) => void;
  onOpenMobileMenu: () => void;
  cartCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentPage,
  onNavigate,
  onOpenMobileMenu,
  cartCount = 0,
}) => {
  const item = (active: boolean) =>
    `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[11px] ${
      active ? "bg-emerald-50 font-semibold text-emerald-700" : "text-slate-500"
    }`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-md lg:hidden">
      <div className="flex items-stretch gap-1">
        <button type="button" onClick={() => onNavigate("dashboard")} className={item(currentPage === "dashboard")}>
          <LayoutDashboard className="h-5 w-5" />
          <span>হোম</span>
        </button>
        <button type="button" onClick={() => onNavigate("pos")} className={item(currentPage === "pos")}>
          <span className="relative">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </span>
          <span>বিক্রি</span>
        </button>
        <button type="button" onClick={() => onNavigate("products")} className={item(currentPage === "products")}>
          <Package className="h-5 w-5" />
          <span>স্টক</span>
        </button>
        <button type="button" onClick={() => onNavigate("customers")} className={item(currentPage === "customers")}>
          <BookOpen className="h-5 w-5" />
          <span>বাকি</span>
        </button>
        <button type="button" onClick={onOpenMobileMenu} className={item(false)}>
          <Menu className="h-5 w-5" />
          <span>আরও</span>
        </button>
      </div>
    </nav>
  );
};
