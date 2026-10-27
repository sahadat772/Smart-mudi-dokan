import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BookOpen,
  Truck,
  Receipt,
  Landmark,
  BarChart3,
  Settings,
  LogIn,
  X,
  Store,
  ChevronRight,
} from 'lucide-react';
import { UserRole } from '../../types';

export type NavPageId =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'customers'
  | 'purchases'
  | 'expenses'
  | 'cash'
  | 'reports'
  | 'settings'
  | 'login';

interface SidebarProps {
  currentPage: NavPageId;
  onNavigate: (page: NavPageId) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  currentRole: UserRole;
  lowStockCount: number;
}

interface NavItem {
  id: NavPageId;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
  badge?: number | string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  currentRole,
  lowStockCount,
}) => {
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'ড্যাশবোর্ড',
      sublabel: 'দৈনিক চিত্র ও লাভ-ক্ষতি',
      icon: LayoutDashboard,
    },
    {
      id: 'pos',
      label: 'পিওএস (POS)',
      sublabel: 'দ্রুত বিক্রি ও রসিদ',
      icon: ShoppingCart,
      badge: 'কাউন্টার',
    },
    {
      id: 'products',
      label: 'পণ্য ও স্টক',
      sublabel: 'মজুদ, ক্রয় ও বিক্রয়মূল্য',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} কম` : undefined,
    },
    {
      id: 'customers',
      label: 'বাকির খাতা',
      sublabel: 'কাস্টমার ও আদায়ের হিসাব',
      icon: BookOpen,
    },
    {
      id: 'purchases',
      label: 'মহাজন ও ক্রয়',
      sublabel: 'সাপ্লায়ার চালান ও দেনা',
      icon: Truck,
      ownerOnly: false, // Accessible in preview
    },
    {
      id: 'expenses',
      label: 'খরচের হিসাব',
      sublabel: 'ভাড়া, বিদ্যুৎ ও কর্মচারীর বিল',
      icon: Receipt,
    },
    {
      id: 'cash',
      label: 'ক্যাশবক্স হিসাব',
      sublabel: 'শুরু, শেষ ও ব্যালেন্স ক্লোজিং',
      icon: Landmark,
    },
    {
      id: 'reports',
      label: 'রিপোর্ট ও বিশ্লেষণ',
      sublabel: 'বিক্রি, COGS ও লাভ হিসাব',
      icon: BarChart3,
      ownerOnly: true,
    },
    {
      id: 'settings',
      label: 'কর্মচারী ও সেটিংস',
      sublabel: 'দোকান প্রোফাইল ও অনুমতি',
      icon: Settings,
      ownerOnly: true,
    },
    {
      id: 'login',
      label: 'লগইন স্ক্রিন',
      sublabel: 'প্রমাণীকরণ ইন্টারফেস',
      icon: LogIn,
    },
  ];

  const handleItemClick = (pageId: NavPageId) => {
    onNavigate(pageId);
    onCloseMobile();
  };

  const content = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-tight">
              স্মার্ট মুদি ম্যানেজার
            </h1>
            <p className="text-[11px] text-slate-400">Smart Mudi Manager</p>
          </div>
        </div>

        <button
          onClick={onCloseMobile}
          className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
          aria-label="বন্ধ করুন"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role notice banner inside sidebar */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span>বর্তমান মোড:</span>
        <span
          className={`font-semibold ${
            currentRole === 'owner' ? 'text-emerald-400' : 'text-blue-400'
          }`}
        >
          {currentRole === 'owner' ? 'মালিক (পূর্ণ নিয়ন্ত্রণ)' : 'কর্মচারী (POS ও স্টক)'}
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;
          const isRestrictedForEmployee = currentRole === 'employee' && item.ownerOnly;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between group transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white font-medium shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                  }`}
                />
                <div className="truncate">
                  <div className="text-sm leading-tight truncate">{item.label}</div>
                  <div
                    className={`text-[11px] truncate ${
                      isActive ? 'text-emerald-100' : 'text-slate-400'
                    }`}
                  >
                    {item.sublabel}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {isRestrictedForEmployee && (
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                    মালিক
                  </span>
                )}
                {item.badge && !isRestrictedForEmployee && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      isActive
                        ? 'bg-emerald-700 text-emerald-100'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                <ChevronRight
                  className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isActive ? 'opacity-100 text-emerald-200' : 'text-slate-400'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-slate-300">Phase 1 Prototype</span>
          <span className="text-emerald-400 bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-800/50">
            UI Shell
          </span>
        </div>
        <p className="text-[10px] text-slate-500 leading-snug">
          VS Code ও Firebase-এ পরবর্তী ডেভেলপমেন্টের জন্য প্রস্তুত ফ্রন্টএন্ড আর্কিটেকচার।
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 border-r border-slate-800">
        {content}
      </aside>

      {/* Mobile Drawer Backdrop & Container */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
