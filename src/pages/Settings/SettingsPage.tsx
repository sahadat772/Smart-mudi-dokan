import React, { useState } from 'react';
import {
  Settings,
  Store,
  Printer,
  Shield,
  UserCheck,
  Plus,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ShopSettings, UserRole } from '../../types';

interface SettingsPageProps {
  settings: ShopSettings;
  onUpdateSettings: (settings: ShopSettings) => void;
  currentRole: UserRole;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  currentRole,
}) => {
  const [formData, setFormData] = useState<ShopSettings>({ ...settings });
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Role permissions matrix mockup for Phase 1 / Phase 2
  const permissionMatrix = [
    {
      feature: 'পিওএস (POS) দ্রুত বিক্রি সম্পন্ন করা',
      owner: true,
      employee: true,
      note: 'উভয়ের জন্য উন্মুক্ত',
    },
    {
      feature: 'পণ্য ও বর্তমান স্টক সংখ্যা দেখা',
      owner: true,
      employee: true,
      note: 'দোকানে মাল আছে কি না যাচাই করতে',
    },
    {
      feature: 'পণ্যের পাইকারি ক্রয়মূল্য (Cost Price) দেখা',
      owner: true,
      employee: false,
      note: 'কর্মচারীর কাছে ক্রয়মূল্য গোপন থাকবে',
    },
    {
      feature: 'গ্রাহকের বাকির খাতা ও আদায় লিপিবদ্ধ করা',
      owner: true,
      employee: true,
      note: 'নগদ আদায় এন্ট্রি অনুমোদিত',
    },
    {
      feature: 'দৈনন্দিন দোকান খরচ (Expenses) যুক্ত করা',
      owner: true,
      employee: true,
      note: 'চা-নাস্তা বা ভ্যান ভাড়া এন্ট্রি',
    },
    {
      feature: 'মোট লাভ, COGS ও নিট প্রফিট রিপোর্ট দেখা',
      owner: true,
      employee: false,
      note: 'শুধুমাত্র মালিকের জন্য সংরক্ষিত',
    },
    {
      feature: 'নতুন পণ্য তৈরি বা বিক্রয়মূল্য পরিবর্তন',
      owner: true,
      employee: false,
      note: 'মালিকের অনুমতি সাপেক্ষে',
    },
    {
      feature: 'কর্মচারী নিয়োগ ও সিস্টেম সেটিংস কনফিগারেশন',
      owner: true,
      employee: false,
      note: 'শুধুমাত্র মালিকের নিয়ন্ত্রণ',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            দোকানের সেটিংস ও কর্মচারী ব্যবস্থাপনা (Staff & Settings)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            দোকানের পরিচিতি, ক্যাশ মেমো রসিদ ফরম্যাট ও রোল-ভিত্তিক পারমিশন
          </p>
        </div>
      </div>

      {/* Security notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900">
        <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">সিকিউরিটি ও রোল আর্কিটেকচার:</span>{' '}
          Phase 1-এ এটি ইউআই প্রিভিউ। Phase 2-এ যখন Firebase Authentication ও Cloud Firestore যুক্ত করা হবে, তখন শুধুমাত্র ক্লায়েন্ট ইউআই হাইড নয়, বরং <strong>Firestore Security Rules</strong> এবং ব্যাকএন্ড টোকেন যাচাইয়ের মাধ্যমে ডেটা নিরাপত্তা নিশ্চিত করা হবে।
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Shop & Receipt Settings Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-xs text-slate-900">
                দোকানের তথ্য ও রসিদ সেটিংস
              </h2>
            </div>
            {isSaved && (
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                সংরক্ষিত হয়েছে (ডেমো)
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                দোকানের নাম (রসিদে প্রদর্শিত) *
              </label>
              <input
                type="text"
                required
                value={formData.shopName}
                onChange={(e) =>
                  setFormData({ ...formData, shopName: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                ট্যাগলাইন বা স্লোগান
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) =>
                  setFormData({ ...formData, tagline: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  প্রোপ্রাইটর / মালিকের নাম
                </label>
                <input
                  type="text"
                  value={formData.proprietorName}
                  onChange={(e) =>
                    setFormData({ ...formData, proprietorName: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  ভ্যাট / BIN নম্বর (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={formData.vatNumber || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, vatNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  প্রাথমিক মোবাইল নম্বর *
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  বিকল্প মোবাইল নম্বর
                </label>
                <input
                  type="text"
                  value={formData.secondaryPhone || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, secondaryPhone: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                দোকানের পূর্ণ ঠিকানা *
              </label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                ক্যাশ মেমোর নিচের কৃতজ্ঞতা ও শর্ত বার্তা *
              </label>
              <input
                type="text"
                value={formData.receiptFooterMsg}
                onChange={(e) =>
                  setFormData({ ...formData, receiptFooterMsg: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>সেটিংস আপডেট করুন</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Staff & Role Permissions Matrix (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Staff Accounts Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-xs text-slate-900">
                  নিবন্ধিত একাউন্ট ও ভূমিকা
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">২টি সক্রিয় রোল</span>
            </div>

            <div className="divide-y divide-slate-100 p-2">
              <div className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <span>মো. শাহাদাত হোসেন</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-semibold">
                      মালিক (Owner)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    owner@smartmudi.com · ল্যাপটপ
                  </div>
                </div>
              </div>

              <div className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <span>কামরুল হাসান</span>
                    <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded font-semibold">
                      বিক্রয় কর্মী (Employee)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    staff@smartmudi.com · অ্যান্ড্রয়েড ফোন
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Role Permissions Matrix */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-xs text-slate-900">
                  ভবিষ্যৎ রোল অনুমতি মেট্রিক্স (Phase 2 Matrix)
                </h3>
              </div>
            </div>

            <div className="p-3 text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[10px]">
                    <th className="pb-1.5 font-medium">ফিচার ও কার্যাবলী</th>
                    <th className="pb-1.5 text-center font-medium">মালিক</th>
                    <th className="pb-1.5 text-center font-medium">কর্মী</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {permissionMatrix.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 pr-2">
                        <div className="font-medium text-slate-900">
                          {item.feature}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.note}
                        </div>
                      </td>
                      <td className="py-2 text-center">
                        <span className="text-emerald-600 font-bold">✓</span>
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
