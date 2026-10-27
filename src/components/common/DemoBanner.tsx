import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp, Database } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-2.5 text-xs text-amber-900 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-amber-200/60 text-amber-800 shrink-0">
            <Info className="w-3.5 h-3.5" />
          </span>
          <span className="font-semibold text-amber-950">
            প্রোটোটাইপ ডেমো ডাটা (Phase 1):
          </span>
          <span className="text-amber-800">
            এই স্ক্রিনের সকল তথ্য ও সংখ্যা পরীক্ষামূলক। কোনো স্থায়ী ডাটাবেস বা ফায়ারবেস সংরক্ষণ নেই।
          </span>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1 font-medium text-amber-900 hover:text-amber-950 underline decoration-amber-400 hover:decoration-amber-700 underline-offset-2 shrink-0 cursor-pointer"
        >
          <span>{isExpanded ? 'সংক্ষিপ্ত বিবরণ' : 'ফেজ ও আর্কিটেকচার রুলস'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="max-w-7xl mx-auto mt-2.5 pt-2.5 border-t border-amber-200/60 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] leading-relaxed text-amber-900">
          <div className="bg-white/80 p-2.5 rounded border border-amber-200/60">
            <div className="font-bold text-amber-950 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              ১. Phase 1 (বর্তমান ধাপ)
            </div>
            <p className="text-slate-600">
              React + TypeScript রেসপনসিভ UI প্রোটোটাইপ। ল্যাপটপ ও অ্যান্ড্রয়েড মোবাইল উভয় স্ক্রিনের জন্য দশটি স্ক্রিনের নেভিগেশন ও ডিজাইন তৈরি।
            </p>
          </div>

          <div className="bg-white/80 p-2.5 rounded border border-amber-200/60">
            <div className="font-bold text-amber-950 mb-1 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              ২. Phase 2 (VS Code + Firebase)
            </div>
            <p className="text-slate-600">
              GitHub রিপোজিটরিতে কোড নেওয়া হবে। এরপর Firebase Authentication, Cloud Firestore ডাটাবেস ও Security Rules যুক্ত হবে।
            </p>
          </div>

          <div className="bg-white/80 p-2.5 rounded border border-amber-200/60">
            <div className="font-bold text-amber-950 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              ৩. অ্যাকাউন্টিং নীতিমালা
            </div>
            <p className="text-slate-600">
              বিক্রি, ক্রয় ও বাকির সমন্বয় আলাদা থাকবে। কাস্টমারের বাকি আদায়কে নতুন বিক্রি ধরা হবে না এবং মহাজনের বকেয়া পরিশোধ পুনরায় খরচ হিসেবে গণ্য হবে না।
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
