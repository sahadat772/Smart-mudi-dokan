import React, { useState } from "react";
import {
  Store,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";

import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../../firebase";
import { UserRole } from "../../types";

interface LoginPageProps {
  onLoginSuccess: (role: UserRole, mustChangePassword: boolean) => void;
  currentRole: UserRole;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Firebase Error Messages
  const getErrorMessage = (code: string) => {
    const messages: Record<string, string> = {
      "auth/invalid-credential": "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।",

      "auth/user-not-found": "এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি।",

      "auth/wrong-password": "পাসওয়ার্ড সঠিক নয়।",

      "auth/invalid-email": "সঠিক ইমেইল এড্রেস লিখুন।",

      "auth/too-many-requests":
        "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।",

      "auth/network-request-failed":
        "ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।",

      "auth/user-disabled":
        "এই অ্যাকাউন্টটি Firebase থেকে নিষ্ক্রিয় করা হয়েছে।",
    };

    return messages[code] || "লগইন করা যায়নি। আবার চেষ্টা করুন।";
  };

  // Login Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setSuccess(null);

    if (!email.trim() || !password) {
      setError("ইমেইল ও পাসওয়ার্ড লিখুন।");
      return;
    }

    setIsLoading(true);

    try {
      console.log("LOGIN: Starting Firebase authentication");

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      const user = userCredential.user;

      console.log("LOGIN: Firebase authentication successful");

      // Fetch Firestore User Profile
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      console.log("LOGIN: Firestore profile checked");

      if (!userSnap.exists()) {
        await signOut(auth);
        setError("এই অ্যাকাউন্টের User Profile পাওয়া যায়নি।");
        return;
      }

      const userData = userSnap.data();

      // Verify Account Status
      if (userData.active !== true) {
        await signOut(auth);
        setError("এই অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয়।");
        return;
      }

      // Verify User Role
      if (userData.role !== "owner" && userData.role !== "employee") {
        await signOut(auth);
        setError("এই অ্যাকাউন্টের Role সঠিক নয়।");
        return;
      }

      console.log("LOGIN: Profile verified successfully");

      onLoginSuccess(
        userData.role as UserRole,
        userData.role === "employee" && userData.mustChangePassword === true,
      );
    } catch (err: any) {
      console.error("LOGIN ERROR DETAILS:", {
        code: err.code,
        message: err.message,
      });

      setError(getErrorMessage(err.code) + ` (${err.code || "unknown-error"})`);

      // Clear any incomplete authentication session
      if (auth.currentUser) {
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.error("Sign out error:", signOutError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password Handler
  const handleForgotPassword = async () => {
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("প্রথমে আপনার ইমেইল এড্রেস লিখুন।");
      return;
    }

    setIsResetting(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());

      setSuccess("Password Reset Link আপনার ইমেইলে পাঠানো হয়েছে।");
    } catch (err: any) {
      console.error("PASSWORD RESET ERROR:", err);

      setError(getErrorMessage(err.code));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
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

          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-[11px]">
            <CheckCircle2 className="w-3 h-3" />
            Secure Firebase Login
          </div>
        </div>

        {/* Login Form */}
        <div className="p-6">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-800">স্বাগতম!</h3>

            <p className="text-xs text-slate-500 mt-1">
              আপনার অ্যাকাউন্ট দিয়ে লগইন করুন।
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                {success}
              </div>
            )}

            {/* Email */}
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
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  placeholder="name@example.com"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                পাসওয়ার্ড
              </label>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  placeholder="আপনার পাসওয়ার্ড লিখুন"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isResetting}
                className="text-xs text-emerald-700 hover:underline disabled:opacity-50"
              >
                {isResetting ? "অপেক্ষা করুন..." : "পাসওয়ার্ড ভুলে গেছেন?"}
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>লগইন হচ্ছে...</span>
                </>
              ) : (
                <>
                  <span>লগইন করুন</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
            <KeyRound className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />

            <p>
              আপনার Account-এর Role ও Permission Firebase থেকে যাচাই করা হয়।
              অনুমোদিত Owner ও Staff সদস্যরা এখানে লগইন করতে পারবেন।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
