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
  X,
  ChevronRight,
  ShieldCheck,
  UserRound,
  Sparkles,
  CreditCard,
  ClipboardCheck,
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
  | "subscription"
  | "platform-admin"
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
  isPlatformAdmin?: boolean;
  permissions?: Record<string, ModulePermission>;
}

interface NavItem {
  id: NavPageId;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
  platformAdminOnly?: boolean;
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
  isPlatformAdmin = false,
  permissions,
}) => {
  const navGroups: NavGroup[] = [
    {
      title: "সারাংশ",
      items: [
        {
          id: "dashboard",
          label: "ড্যাশবোর্ড",
          sublabel: "আজকের হিসাব",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "দোকান",
      items: [
        {
          id: "pos",
          label: "নতুন বিক্রি",
          sublabel: "POS ও ক্যাশ মেমো",
          icon: ShoppingCart,
        },
        {
          id: "products",
          label: "পণ্য ও স্টক",
          sublabel: "দাম ও পরিমাণ",
          icon: Package,
        },
        {
          id: "customers",
          label: "কাস্টমার ও বাকি",
          sublabel: "বাকি ও আদায়",
          icon: BookOpen,
        },
        {
          id: "purchases",
          label: "মহাজন ও ক্রয়",
          sublabel: "সাপ্লায়ার হিসাব",
          icon: Truck,
        },
      ],
    },
    {
      title: "হিসাব",
      items: [
        {
          id: "expenses",
          label: "খরচ",
          sublabel: "দৈনিক খরচ",
          icon: Receipt,
        },
        {
          id: "cash",
          label: "ক্যাশ",
          sublabel: "খোলা ও বন্ধ",
          icon: Landmark,
        },
        {
          id: "reports",
          label: "রিপোর্ট",
          sublabel: "বিক্রি ও লাভ",
          icon: BarChart3,
          ownerOnly: true,
        },
      ],
    },
    {
      title: "সিস্টেম",
      items: [
        {
          id: "staff",
          label: "কর্মচারী",
          sublabel: "অ্যাকাউন্ট ও অনুমতি",
          icon: UserRound,
          ownerOnly: true,
        },
        {
          id: "settings",
          label: "সেটিংস",
          sublabel: "দোকান ও রসিদ",
          icon: Settings,
          ownerOnly: true,
        },
        {
          id: "subscription",
          label: "সাবস্ক্রিপশন",
          sublabel: "প্ল্যান ও নবায়ন",
          icon: CreditCard,
          ownerOnly: true,
        },
      ],
    },
    ...(isPlatformAdmin
      ? [{
          title: "প্ল্যাটফর্ম",
          items: [
            {
              id: "platform-admin" as const,
              label: "Payment approvals",
              sublabel: "Manual subscription request",
              icon: ClipboardCheck,
              platformAdminOnly: true,
            },
          ],
        }]
      : []),
  ];

  const isOwner = currentRole === "owner";
  const hasViewAccess = (pageId: NavPageId): boolean => {
    if (pageId === "platform-admin") return isPlatformAdmin;
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

    if (selectedItem?.ownerOnly && !isOwner) return;
    if (selectedItem?.platformAdminOnly && !isPlatformAdmin) return;
    onNavigate(pageId);
    onCloseMobile();
  };

  const content = (
    <div className="flex h-full flex-col bg-[#0f172a] text-slate-300">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <img
            src="/logo.svg"
            alt="Smart Mudi"
            className="h-11 w-11 shrink-0 rounded-2xl bg-white shadow-lg shadow-emerald-950/30"
          />
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold text-white">স্মার্ট মুদি</h1>
            <p className="mt-0.5 text-[11px] tracking-wide text-slate-400">MANAGER</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-2 pt-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isOwner ? "bg-emerald-500/15 text-emerald-300" : "bg-blue-500/15 text-blue-300"
              }`}
            >
              {isOwner ? <ShieldCheck className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                {isOwner ? "মালিক" : "কর্মচারী"}
              </p>
              <p className="text-[11px] text-slate-400">
                {isOwner ? "পূর্ণ নিয়ন্ত্রণ" : "সীমিত অ্যাক্সেস"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-1.5 px-3 text-[10px] font-bold tracking-wide text-slate-500">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items
                .filter((item) => hasViewAccess(item.id))
                .map((item) => {
                  const isActive = currentPage === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemClick(item.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${
                        isActive
                          ? "bg-emerald-500/15 text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isActive ? "bg-emerald-500 text-white" : "bg-white/5 text-slate-400"
                        }`}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-[13px] font-semibold ${isActive ? "text-emerald-200" : ""}`}>
                          {item.label}
                        </p>
                        <p className="truncate text-[10px] text-slate-500">{item.sublabel}</p>
                      </div>
                      {item.id === "products" && lowStockCount > 0 && (
                        <span className="rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                          {lowStockCount}
                        </span>
                      )}
                      <ChevronRight className={`h-3.5 w-3.5 ${isActive ? "text-emerald-300" : "text-slate-600"}`} />
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span>লাইভ হিসাব</span>
          <span className="ml-auto inline-flex items-center gap-1 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Online
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-800 lg:block">
        {content}
      </aside>
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/70"
            onClick={onCloseMobile}
            aria-label="সাইডবার বন্ধ করুন"
          />
          <div className="relative h-full w-72 max-w-[85vw] shadow-2xl">
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="বন্ধ করুন"
              className="absolute right-3 top-4 z-20 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            {content}
          </div>
        </div>
      )}
    </>
  );
};

