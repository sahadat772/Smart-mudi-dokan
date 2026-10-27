import React from 'react';
import { LayoutDashboard, ShoppingCart, Package, BookOpen, Menu } from 'lucide-react';
import { NavPageId } from './Sidebar';

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
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-30 px-2 flex items-center justify-around shadow-lg">
      <button
        onClick={() => onNavigate('dashboard')}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors ${
          currentPage === 'dashboard' ? 'text-emerald-700 font-semibold' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <LayoutDashboard className="w-5 h-5 mb-0.5" />
        <span className="text-[11px] leading-tight">ড্যাশবোর্ড</span>
      </button>

      <button
        onClick={() => onNavigate('pos')}
        className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
          currentPage === 'pos'
            ? 'text-emerald-700 font-semibold'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <div className="relative">
          <ShoppingCart className="w-5 h-5 mb-0.5" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {cartCount}
            </span>
          )}
        </div>
        <span className="text-[11px] leading-tight">পিওএস</span>
      </button>

      <button
        onClick={() => onNavigate('products')}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors ${
          currentPage === 'products' ? 'text-emerald-700 font-semibold' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Package className="w-5 h-5 mb-0.5" />
        <span className="text-[11px] leading-tight">পণ্য ও স্টক</span>
      </button>

      <button
        onClick={() => onNavigate('customers')}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors ${
          currentPage === 'customers' ? 'text-emerald-700 font-semibold' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <BookOpen className="w-5 h-5 mb-0.5" />
        <span className="text-[11px] leading-tight">বাকির খাতা</span>
      </button>

      <button
        onClick={onOpenMobileMenu}
        className="flex flex-col items-center justify-center py-1 px-2 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
      >
        <Menu className="w-5 h-5 mb-0.5" />
        <span className="text-[11px] leading-tight">আরও মেনু</span>
      </button>
    </nav>
  );
};
