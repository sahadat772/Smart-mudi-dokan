import React, { useState } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { auth } from "../../firebase";

interface ChangePasswordPageProps {
  onPasswordChanged: () => void;
}

export const ChangePasswordPage: React.FC<ChangePasswordPageProps> = ({
  onPasswordChanged,
}) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8 || newPassword.length > 128) {
      setError("পাসওয়ার্ড ৮ থেকে ১২৮ অক্ষরের মধ্যে হতে হবে।");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("নতুন পাসওয়ার্ড ও Confirm Password মিলছে না।");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setError("আপনার Login Session পাওয়া যায়নি। আবার লগইন করুন।");
      return;
    }

    setIsLoading(true);

    try {
      const idToken = await user.getIdToken();

      const response = await fetch("/api/staff/complete-first-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Password পরিবর্তন করা যায়নি।");
      }

      // Force refresh so subsequent API calls use an up-to-date token/session.
      await user.getIdToken(true);

      setNewPassword("");
      setConfirmPassword("");

      onPasswordChanged();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Password পরিবর্তন করা যায়নি। আবার চেষ্টা করুন।",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-6 text-white text-center">
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold">নতুন পাসওয়ার্ড সেট করুন</h2>

          <p className="text-xs text-slate-300 mt-2">
            নিরাপত্তার জন্য প্রথম লগইনে পাসওয়ার্ড পরিবর্তন বাধ্যতামূলক।
          </p>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-2 p-3 mb-5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>
              নতুন পাসওয়ার্ড সেট না করা পর্যন্ত Dashboard ব্যবহার করা যাবে না।
            </p>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                নতুন পাসওয়ার্ড
              </label>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />

                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="কমপক্ষে ৮ অক্ষর"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400"
                  aria-label="Toggle new password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Confirm Password
              </label>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />

                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="পাসওয়ার্ড আবার লিখুন"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-400"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                "পাসওয়ার্ড পরিবর্তন হচ্ছে..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  পাসওয়ার্ড পরিবর্তন করুন
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
