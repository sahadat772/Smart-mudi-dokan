import React, { useState } from 'react';
import { Store, Lock, Mail, Shield, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { UserRole } from '../../types';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole) => void;
  currentRole: UserRole;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  currentRole,
}) => {
  const [email, setEmail] = useState('owner@smartmudi.com');
  const [password, setPassword] = useState('••••••••');
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('অনুগ্রহ করে সঠিক ইমেইল এড্রেস লিখুন।');
      return;
    }
    if (!password || password.length < 4) {
      setError('পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।');
      return;
    }

    setIsLoading(true);
    // Simulate UI authentication transition
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(selectedRole);
    }, 400);
  };

  const handleSelectDemoRole = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'owner') {
      setEmail('owner@smartmudi.com');
    } else {
      setEmail('staff@smartmudi.com');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white text-center">
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">স্মার্ট মুদি ম্যানেজার</h2>
          <p className="text-xs text-slate-300 mt-1">
            দোকান পরিচালনা ও পিওএস বিক্রয় ব্যবস্থাপনা
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-400/30 text-amber-200 text-[11px]">
            <span>Phase 1 UI ডেমো — স্থায়ী প্রমাণীকরণ ছাড়া</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {/* Role selector tab */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              ডেমো টেস্ট রোল নির্বাচন করুন:
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleSelectDemoRole('owner')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedRole === 'owner'
                    ? 'bg-white text-emerald-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>মালিক (ল্যাপটপ)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectDemoRole('employee')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedRole === 'employee'
                    ? 'bg-white text-blue-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>কর্মচারী (মোবাইল)</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              {selectedRole === 'owner'
                ? 'মালিক রোল: বিক্রি, লাভ-ক্ষতি, ক্রয়মূল্য, কর্মচারী ও সেটিংসের পূর্ণ নিয়ন্ত্রণ।'
                : 'কর্মচারী রোল: ফোন থেকে দ্রুত বিক্রি, ক্যাশ গ্রহণ ও পণ্য খোঁজার উপযোগী সহজ ইন্টারফেস।'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ইমেইল এড্রেস
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                পাসওয়ার্ড
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  placeholder="পাসওয়ার্ড লিখুন"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>মনে রাখুন</span>
              </label>
              <span className="text-emerald-700 hover:underline cursor-pointer">
                পাসওয়ার্ড ভুলে গেছেন?
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>লগইন হচ্ছে...</span>
              ) : (
                <>
                  <span>লগইন করুন</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Phase 2 Note */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              Phase 2 তে Firebase Authentication যুক্ত হলে স্বয়ংক্রিয়ভাবে ব্যবহারকারীর নিরাপদ টোকেন ও পারমিশন নিশ্চিত করা হবে।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
