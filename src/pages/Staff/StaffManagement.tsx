import React, { useEffect, useState } from "react";
import { UserPlus, Users, UserCheck, UserX, Shield } from "lucide-react";
import { apiFetch } from "../../api/client";

type JobRole =
  | "manager"
  | "cashier"
  | "sales_staff"
  | "inventory_staff"
  | "custom";

const modules = [
  { key: "dashboard", label: "ড্যাশবোর্ড" },
  { key: "pos", label: "বিক্রি (POS)" },
  { key: "products", label: "পণ্য ও স্টক" },
  { key: "customers", label: "কাস্টমার ও বাকি" },
  { key: "purchases", label: "ক্রয় ও মহাজন" },
  { key: "expenses", label: "খরচ" },
  { key: "cash", label: "ক্যাশ" },
  { key: "reports", label: "রিপোর্ট" },
  { key: "staff", label: "কর্মচারী" },
  { key: "settings", label: "সেটিংস" },
] as const;

type ModuleKey = (typeof modules)[number]["key"];

interface Permission {
  view: boolean;
  manage: boolean;
}

type PermissionSet = Record<ModuleKey, Permission>;

interface StaffMember {
  uid: string;
  name: string;
  email: string;
  jobRole: string;
  active: boolean;
  lastLoginAt?: string;
}

const roleLabels: Record<string, string> = {
  manager: "ম্যানেজার",
  cashier: "ক্যাশিয়ার",
  sales_staff: "বিক্রয় কর্মী",
  inventory_staff: "স্টক কর্মী",
  custom: "কাস্টম",
};

const createEmptyPermissions = (): PermissionSet => ({
  dashboard: { view: false, manage: false },
  pos: { view: false, manage: false },
  products: { view: false, manage: false },
  customers: { view: false, manage: false },
  purchases: { view: false, manage: false },
  expenses: { view: false, manage: false },
  cash: { view: false, manage: false },
  reports: { view: false, manage: false },
  staff: { view: false, manage: false },
  settings: { view: false, manage: false },
});

const roleDefaults: Record<Exclude<JobRole, "custom">, PermissionSet> = {
  manager: {
    ...createEmptyPermissions(),
    dashboard: { view: true, manage: false },
    pos: { view: true, manage: true },
    products: { view: true, manage: true },
    customers: { view: true, manage: true },
    purchases: { view: true, manage: true },
    expenses: { view: true, manage: true },
    cash: { view: true, manage: true },
    reports: { view: true, manage: false },
    staff: { view: true, manage: false },
  },
  cashier: {
    ...createEmptyPermissions(),
    dashboard: { view: true, manage: false },
    pos: { view: true, manage: true },
    products: { view: true, manage: false },
    customers: { view: true, manage: true },
    cash: { view: true, manage: false },
  },
  sales_staff: {
    ...createEmptyPermissions(),
    dashboard: { view: true, manage: false },
    pos: { view: true, manage: true },
    products: { view: true, manage: false },
    customers: { view: true, manage: true },
  },
  inventory_staff: {
    ...createEmptyPermissions(),
    dashboard: { view: true, manage: false },
    products: { view: true, manage: true },
    purchases: { view: true, manage: true },
  },
};

const StaffManagement: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<JobRole>("cashier");
  const [permissions, setPermissions] = useState<PermissionSet>(() => ({
    ...roleDefaults.cashier,
  }));
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusBusyUid, setStatusBusyUid] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadStaff = async () => {
    try {
      setListLoading(true);
      setError("");
      const data = await apiFetch<{ employees?: StaffMember[] }>("/api/staff");
      setStaffList(data.employees || []);
    } catch (err) {
      console.error("Failed to load staff:", err);
      setError(
        err instanceof Error
          ? err.message
          : "কর্মচারী তালিকা লোড করা যায়নি।",
      );
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    void loadStaff();
  }, []);

  const handleRoleChange = (role: JobRole) => {
    setSelectedRole(role);
    if (role === "custom") {
      setPermissions(createEmptyPermissions());
    } else {
      setPermissions({ ...roleDefaults[role] });
    }
  };

  const handlePermissionChange = (
    module: ModuleKey,
    permissionType: "view" | "manage",
    checked: boolean,
  ) => {
    setPermissions((previous) => {
      const updated = {
        ...previous,
        [module]: { ...previous[module] },
      };

      if (permissionType === "manage") {
        updated[module].manage = checked;
        if (checked) updated[module].view = true;
      } else {
        updated[module].view = checked;
        if (!checked) updated[module].manage = false;
      }

      return updated;
    });
  };

  const resetForm = () => {
    setStaffName("");
    setStaffEmail("");
    setPassword("");
    setConfirmPassword("");
    setSelectedRole("cashier");
    setPermissions({ ...roleDefaults.cashier });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("পাসওয়ার্ড ও নিশ্চিতকরণ মিলছে না।");
      return;
    }

    if (password.length < 8) {
      setError("অস্থায়ী পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।");
      return;
    }

    if (!staffName.trim() || !staffEmail.trim()) {
      setError("নাম ও ইমেইল দিন।");
      return;
    }

    if (selectedRole === "custom") {
      const hasPermission = modules.some(
        ({ key }) => permissions[key].view || permissions[key].manage,
      );
      if (!hasPermission) {
        setError("কাস্টম রোলে অন্তত একটি অনুমতি দিন।");
        return;
      }
    }

    try {
      setLoading(true);
      await apiFetch("/api/staff", {
        method: "POST",
        body: JSON.stringify({
          name: staffName.trim(),
          email: staffEmail.trim().toLowerCase(),
          password,
          role: selectedRole,
          permissions,
        }),
      });

      setSuccess(
        "কর্মচারী অ্যাকাউন্ট তৈরি হয়েছে। প্রথম লগইনে পাসওয়ার্ড বদলাতে হবে।",
      );
      resetForm();
      setShowForm(false);
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "কিছু সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (uid: string, nextActive: boolean) => {
    setError("");
    setSuccess("");
    setStatusBusyUid(uid);

    try {
      await apiFetch(`/api/staff/${uid}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active: nextActive }),
      });
      setSuccess(
        nextActive
          ? "কর্মচারী সক্রিয় করা হয়েছে।"
          : "কর্মচারী নিষ্ক্রিয়; সেশন বাতিল।",
      );
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "স্ট্যাটাস আপডেট ব্যর্থ।");
    } finally {
      setStatusBusyUid(null);
    }
  };

  const activeStaff = staffList.filter((staff) => staff.active).length;
  const inactiveStaff = staffList.filter((staff) => !staff.active).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            কর্মচারী ম্যানেজমেন্ট
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            রোল, অনুমতি ও অ্যাকাউন্ট — সিকিউর API দিয়ে
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setError("");
            setSuccess("");
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          <UserPlus className="h-4 w-4" />
          নতুন কর্মচারী
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Users className="h-4 w-4" />
            মোট কর্মচারী
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            {staffList.length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <UserCheck className="h-4 w-4 text-emerald-600" />
            সক্রিয়
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">
            {activeStaff}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <UserX className="h-4 w-4 text-rose-500" />
            নিষ্ক্রিয়
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-rose-600">
            {inactiveStaff}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              নতুন কর্মচারী যোগ
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              অ্যাকাউন্ট তৈরি করে অনুমতি নির্ধারণ করুন
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="mb-1 block font-medium text-slate-700">
                পূর্ণ নাম *
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="যেমন: করিম আলী"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-700">
                ইমেইল *
              </label>
              <input
                type="email"
                required
                maxLength={254}
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="staff@example.com"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  অস্থায়ী পাসওয়ার্ড *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  পাসওয়ার্ড নিশ্চিত *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-700">
                রোল
              </label>
              <select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value as JobRole)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="manager">ম্যানেজার</option>
                <option value="cashier">ক্যাশিয়ার</option>
                <option value="sales_staff">বিক্রয় কর্মী</option>
                <option value="inventory_staff">স্টক কর্মী</option>
                <option value="custom">কাস্টম</option>
              </select>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <Shield className="h-4 w-4 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">অনুমতি</h3>
              </div>
              <div className="space-y-2 p-4">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-100 pb-2 text-[11px] font-semibold text-slate-500">
                  <div className="col-span-6 sm:col-span-8">মডিউল</div>
                  <div className="col-span-3 text-center sm:col-span-2">দেখা</div>
                  <div className="col-span-3 text-center sm:col-span-2">
                    পরিচালনা
                  </div>
                </div>
                {modules.map((module) => (
                  <div
                    key={module.key}
                    className="grid grid-cols-12 items-center gap-2 border-b border-slate-50 py-2 last:border-0"
                  >
                    <div className="col-span-6 text-sm font-medium text-slate-700 sm:col-span-8">
                      {module.label}
                    </div>
                    <div className="col-span-3 flex justify-center sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={permissions[module.key].view}
                        onChange={(e) =>
                          handlePermissionChange(
                            module.key,
                            "view",
                            e.target.checked,
                          )
                        }
                        className="h-4 w-4 accent-emerald-600"
                      />
                    </div>
                    <div className="col-span-3 flex justify-center sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={permissions[module.key].manage}
                        onChange={(e) =>
                          handlePermissionChange(
                            module.key,
                            "manage",
                            e.target.checked,
                          )
                        }
                        className="h-4 w-4 accent-emerald-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? "তৈরি হচ্ছে..." : "অ্যাকাউন্ট তৈরি"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                  setError("");
                }}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                বাতিল
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">কর্মচারী তালিকা</h2>
        </div>

        {listLoading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            লোড হচ্ছে...
          </div>
        ) : staffList.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            এখনো কোনো কর্মচারী নেই। উপরের বাটন দিয়ে যোগ করুন।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">নাম</th>
                  <th className="px-4 py-3 font-medium">ইমেইল</th>
                  <th className="px-4 py-3 font-medium">রোল</th>
                  <th className="px-4 py-3 font-medium">স্ট্যাটাস</th>
                  <th className="px-4 py-3 font-medium">শেষ লগইন</th>
                  <th className="px-4 py-3 font-medium">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map((staff) => (
                  <tr key={staff.uid} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {staff.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{staff.email}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {roleLabels[staff.jobRole] || staff.jobRole}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                          staff.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {staff.active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {staff.lastLoginAt || "কখনো নয়"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={statusBusyUid === staff.uid}
                        onClick={() =>
                          void toggleActive(staff.uid, !staff.active)
                        }
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {statusBusyUid === staff.uid
                          ? "আপডেট..."
                          : staff.active
                            ? "নিষ্ক্রিয় করুন"
                            : "সক্রিয় করুন"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffManagement;
