import React from 'react';
import { Menu, Bell, Shield, User, Store, AlertTriangle } from 'lucide-react';
import { UserRole } from '../../types';

interface TopbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenMobileMenu: () => void;
  lowStockCount: number;
  onNavigateToLowStock: () => void;
  shopName: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentRole,
  onRoleChange,
  onOpenMobileMenu,
  lowStockCount,
  onNavigateToLowStock,
  shopName,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between gap-4">
      {/* Zone 1: Brand & Mobile Toggle */}
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

      {/* Zone 2: Status & Notifications */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Low Stock Indicator */}
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

        {/* Role Switcher (Preview Mode for Testing Both Views) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => onRoleChange('owner')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 cursor-pointer ${
              currentRole === 'owner'
                ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>মালিক ভিউ</span>
          </button>
          <button
            onClick={() => onRoleChange('employee')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 cursor-pointer ${
              currentRole === 'employee'
                ? 'bg-white text-blue-800 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>কর্মচারী ভিউ</span>
          </button>
        </div>

        {/* Current user badge */}
        <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
            {currentRole === 'owner' ? 'শা' : 'কা'}
          </div>
          <div className="text-left text-xs">
            <div className="font-semibold text-slate-800 leading-none">
              {currentRole === 'owner' ? 'মো. শাহাদাত হোসেন' : 'কামরুল হাসান'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {currentRole === 'owner' ? 'দোকান মালিক (Admin)' : 'বিক্রয় কর্মী (POS)'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
