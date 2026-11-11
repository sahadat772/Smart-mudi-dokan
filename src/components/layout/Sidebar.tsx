import React from "react";
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
  ShieldCheck,
  UserRound,
  CircleAlert,
  Sparkles,
} from "lucide-react";
import { UserRole } from "../../types";

export type NavPageId =
  | "dashboard"
  | "pos"
  | "products"
  | "customers"
  | "purchases"
  | "expenses"
  | "cash"
  | "reports"
  | "staff"
  | "settings"
  | "login"
  | "change-password";

interface ModulePermission {
  view: boolean;
  manage: boolean;
}

interface SidebarProps {
  currentPage: NavPageId;
  onNavigate: (page: NavPageId) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  currentRole: UserRole;
  lowStockCount: number;
  permissions?: Record<string, ModulePermission>;
}

interface NavItem {
  id: NavPageId;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
  badge?: number | string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  currentRole,
  lowStockCount,
  permissions,
}) => {
  const navGroups: NavGroup[] = [
    {
      title: "OVERVIEW",
      items: [
        {
          id: "dashboard",
          label: "ড্যাশবোর্ড",
          sublabel: "দোকানের সার্বিক চিত্র",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "SHOP MANAGEMENT",
      items: [
        {
          id: "pos",
          label: "নতুন বিক্রি (POS)",
          sublabel: "বিক্রি ও ক্যাশ মেমো",
          icon: ShoppingCart,
          badge: "POS",
        },
        {
          id: "products",
          label: "পণ্য ও ইনভেন্টরি",
          sublabel: "স্টক ও পণ্যের তালিকা",
          icon: Package,
          badge: lowStockCount > 0 ? lowStockCount : undefined,
        },
        {
          id: "customers",
          label: "কাস্টমার ও বাকি",
          sublabel: "বাকি ও আদায়ের হিসাব",
          icon: BookOpen,
        },
        {
          id: "purchases",
          label: "মহাজন ও ক্রয়",
          sublabel: "সাপ্লায়ার ও ক্রয় হিসাব",
          icon: Truck,
        },
      ],
    },
    {
      title: "FINANCIAL MANAGEMENT",
      items: [
        {
          id: "expenses",
          label: "খরচের হিসাব",
          sublabel: "দৈনিক ও অন্যান্য খরচ",
          icon: Receipt,
        },
        {
          id: "cash",
          label: "ক্যাশ ম্যানেজমেন্ট",
          sublabel: "ক্যাশ ইন ও আউট",
          icon: Landmark,
        },
        {
          id: "reports",
          label: "রিপোর্ট ও বিশ্লেষণ",
          sublabel: "বিক্রি ও লাভ-ক্ষতি",
          icon: BarChart3,
          ownerOnly: true,
        },
      ],
    },
    {
      title: "SYSTEM",
      items: [
        {
          id: "staff",
          label: "কর্মচারী ম্যানেজমেন্ট",
          sublabel: "কর্মচারী যোগ ও পরিচালনা",
          icon: UserRound,
          ownerOnly: true,
        },
        {
          id: "settings",
          label: "সেটিংস ও কর্মচারী",
          sublabel: "প্রোফাইল ও অনুমতি",
          icon: Settings,
          ownerOnly: true,
        },
        {
          id: "login",
          label: "লগইন স্ক্রিন",
          sublabel: "অ্যাকাউন্ট ইন্টারফেস",
          icon: LogIn,
        },
        {
          id: "change-password",
          label: "পাসওয়ার্ড পরিবর্তন",
          sublabel: "নতুন পাসওয়ার্ড সেট করুন",
          icon: CircleAlert,
        },
      ],
    },
  ];

  const isOwner = currentRole === "owner";
  const hasViewAccess = (pageId: NavPageId): boolean => {
    if (isOwner) return true;

    if (pageId === "staff" || pageId === "settings" || pageId === "login") {
      return false;
    }

    return permissions?.[pageId]?.view === true;
  };

  const handleItemClick = (pageId: NavPageId) => {
    const selectedItem = navGroups
      .flatMap((group) => group.items)
      .find((item) => item.id === pageId);

    if (selectedItem?.ownerOnly && !isOwner) {
      return;
    }

    onNavigate(pageId);
    onCloseMobile();
  };

  const content = (
    <div className="flex flex-col h-full bg-[#101828] text-slate-300">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <Store className="w-6 h-6 text-white" />
            <span className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-[#101828] flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </span>
          </div>

          <div className="min-w-0">
            <h1 className="text-[16px] font-bold text-white tracking-tight">
              স্মার্ট মুদি ম্যানেজার
            </h1>
            <p className="text-[11px] text-slate-400 mt-1 tracking-wide">
              SMART MUDI MANAGER
            </p>
          </div>
        </div>
      </div>

      {/* User Role */}
      <div className="px-4 pt-5 pb-3">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isOwner
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-blue-500/15 text-blue-400"
              }`}
            >
              {isOwner ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <UserRound className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                Current Workspace
              </p>
              <p className="text-sm font-semibold text-white">
                {isOwner ? "মালিক অ্যাকাউন্ট" : "কর্মচারী অ্যাকাউন্ট"}
              </p>
            </div>

            <span
              className={`ml-auto w-2 h-2 rounded-full ${
                isOwner ? "bg-emerald-400" : "bg-blue-400"
              }`}
            />
          </div>

          <div
            className={`text-[10px] font-medium px-2 py-1 rounded-md inline-flex ${
              isOwner
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-blue-500/10 text-blue-400"
            }`}
          >
            {isOwner ? "পূর্ণ নিয়ন্ত্রণ" : "সীমিত অ্যাক্সেস"}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-2 text-[10px] font-bold tracking-[0.14em] text-slate-500">
              {group.title}
            </p>

            <div className="space-y-1">
              {group.items
                .filter((item) => hasViewAccess(item.id))
                .map((item) => {
                  const isActive = currentPage === item.id;
                  const Icon = item.icon;
                  const isRestricted = !isOwner && item.ownerOnly === true;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemClick(item.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={`relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group ${
                        isActive
                          ? "bg-emerald-500/15 text-white shadow-inner shadow-emerald-500/5"
                          : "text-slate-400 hover:bg-white/[0.055] hover:text-white"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-emerald-400" />
                      )}

                      <div
                        className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center transition-colors ${
                          isActive
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-950/40"
                            : "bg-white/[0.045] text-slate-400 group-hover:bg-white/[0.09] group-hover:text-emerald-400"
                        }`}
                      >
                        <Icon className="w-[18px] h-[18px]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-[13px] font-semibold truncate ${
                            isActive ? "text-emerald-300" : ""
                          }`}
                        >
                          {item.label}
                        </p>
                        <p
                          className={`text-[10px] mt-1 truncate ${
                            isActive ? "text-emerald-400/70" : "text-slate-500"
                          }`}
                        >
                          {item.sublabel}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isRestricted && (
                          <span className="text-[9px] px-1.5 py-1 rounded bg-amber-500/10 text-amber-400">
                            মালিক
                          </span>
                        )}

                        {item.id === "products" &&
                          lowStockCount > 0 &&
                          !isRestricted && (
                            <span className="min-w-5 h-5 px-1 rounded-md bg-rose-500/15 text-rose-400 text-[10px] font-bold flex items-center justify-center">
                              {lowStockCount}
                            </span>
                          )}

                        {item.id === "pos" && (
                          <span className="text-[9px] font-bold px-1.5 py-1 rounded bg-emerald-500/10 text-emerald-400">
                            POS
                          </span>
                        )}

                        <ChevronRight
                          className={`w-3.5 h-3.5 transition-all ${
                            isActive
                              ? "text-emerald-400 opacity-100"
                              : "text-slate-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.07]">
        <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/10 p-3 mb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-300">
              SMART MUDI
            </span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            আপনার দোকানের হিসাব এখন আরও সহজ ও স্মার্ট।
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500">
            Phase 1 · Prototype
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            UI Active
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 h-screen sticky top-0 border-r border-slate-800/80">
        {content}
      </aside>

      {/* Mobile Sidebar */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-label="সাইডবার বন্ধ করুন"
          />

          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="বন্ধ করুন"
              className="absolute top-5 right-3 z-20 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            {content}
          </div>
        </div>
      )}
    </>
  );
};
