import React, { useEffect, useState } from "react";
import {
  Store,
  Shield,
  UserCheck,
  Lock,
  Save,
  CheckCircle2,
} from "lucide-react";
import { ShopSettings, UserRole } from "../../types";
import { apiFetch } from "../../api/client";

interface SettingsPageProps {
  settings: ShopSettings;
  onUpdateSettings: (settings: ShopSettings) => void;
  currentRole: UserRole;
  permissions: {
    view: boolean;
    manage: boolean;
  };
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  currentRole,
  permissions,
}) => {
  const [formData, setFormData] = useState<ShopSettings>({ ...settings });
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole !== "owner") return;

    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ settings: ShopSettings }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      onUpdateSettings(data.settings);
      setFormData(data.settings);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "সেভ ব্যর্থ।");
    } finally {
      setSaving(false);
    }
  };

  const permissionMatrix = [
    {
      feature: "পিওএস (POS) দ্রুত বিক্রি",
      owner: true,
      employee: true,
    },
    {
      feature: "স্টক দেখা",
      owner: true,
      employee: true,
    },
    {
      feature: "ক্রয়মূল্য (Cost Price) দেখা",
      owner: true,
      employee: false,
    },
    {
      feature: "বাকি আদায়",
      owner: true,
      employee: true,
    },
    {
      feature: "খরচ এন্ট্রি",
      owner: true,
      employee: true,
    },
    {
      feature: "লাভ/রিপোর্ট",
      owner: true,
      employee: false,
    },
    {
      feature: "পণ্য তৈরি/দাম পরিবর্তন",
      owner: true,
      employee: false,
    },
    {
      feature: "কর্মচারী ও সেটিংস",
      owner: true,
      employee: false,
    },
  ];

  const canAccessSettings =
    currentRole === "owner" && permissions?.view !== false;

  if (!canAccessSettings) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2">
          শুধুমাত্র দোকানের মালিক Settings দেখতে পারবেন।
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          দোকানের সেটিংস
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          দোকানের পরিচিতি ও রসিদ — Firestore-এ সংরক্ষিত
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900">
        <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          শুধুমাত্র Owner সেটিংস পরিবর্তন করতে পারে। রসিদ ও টপবারে দোকানের নাম
          এখান থেকে আসে।
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-xs text-slate-900">
                দোকানের তথ্য ও রসিদ
              </h2>
            </div>
            {isSaved && (
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                সংরক্ষিত
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            {error && (
              <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800">
                {error}
              </div>
            )}

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                দোকানের নাম *
              </label>
              <input
                type="text"
                required
                value={formData.shopName}
                onChange={(e) =>
                  setFormData({ ...formData, shopName: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                ট্যাগলাইন
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) =>
                  setFormData({ ...formData, tagline: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  মালিকের নাম
                </label>
                <input
                  type="text"
                  value={formData.proprietorName}
                  onChange={(e) =>
                    setFormData({ ...formData, proprietorName: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  ভ্যাট / BIN
                </label>
                <input
                  type="text"
                  value={formData.vatNumber || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, vatNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  মোবাইল *
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  বিকল্প মোবাইল
                </label>
                <input
                  type="text"
                  value={formData.secondaryPhone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, secondaryPhone: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                ঠিকানা *
              </label>
              <textarea
                rows={2}
                required
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                রসিদের ফুটার বার্তা
              </label>
              <input
                type="text"
                value={formData.receiptFooterMsg}
                onChange={(e) =>
                  setFormData({ ...formData, receiptFooterMsg: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "সংরক্ষণ..." : "সেটিংস সেভ করুন"}</span>
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-xs">রোল নোট</h3>
            </div>
            <div className="p-4 text-xs text-slate-600">
              কর্মচারী নিয়োগ ও অনুমতি Staff পেজ থেকে পরিচালনা করুন। সেটিংস শুধু
              Owner পরিবর্তন করতে পারেন।
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-xs">অনুমতি সারাংশ</h3>
            </div>
            <div className="p-3 text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-slate-500 text-[10px]">
                    <th className="pb-1.5 font-medium">ফিচার</th>
                    <th className="pb-1.5 text-center font-medium">মালিক</th>
                    <th className="pb-1.5 text-center font-medium">কর্মী</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[11px]">
                  {permissionMatrix.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 pr-2 font-medium">{item.feature}</td>
                      <td className="py-2 text-center text-emerald-600 font-bold">
                        ✓
                      </td>
                      <td className="py-2 text-center">
                        {item.employee ? (
                          <span className="text-emerald-600 font-bold">✓</span>
                        ) : (
                          <span className="text-slate-300 font-bold">✕</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
