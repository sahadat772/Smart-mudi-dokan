import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

type JobRole =
  | "manager"
  | "cashier"
  | "sales_staff"
  | "inventory_staff"
  | "custom";

const modules = [
  { key: "dashboard", label: "Dashboard" },
  { key: "pos", label: "POS / Sales" },
  { key: "products", label: "Products & Inventory" },
  { key: "customers", label: "Customers" },
  { key: "purchases", label: "Purchases" },
  { key: "expenses", label: "Expenses" },
  { key: "cash", label: "Cash Management" },
  { key: "reports", label: "Reports" },
  { key: "staff", label: "Staff Management" },
  { key: "settings", label: "Settings" },
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

const roleLabels: Record<JobRole, string> = {
  manager: "Manager",
  cashier: "Cashier",
  sales_staff: "Sales Staff",
  inventory_staff: "Inventory Staff",
  custom: "Custom",
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
  const [listLoading, setListLoading] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load employee list from Firestore
  const loadStaff = async () => {
    try {
      setListLoading(true);

      const staffQuery = query(
        collection(db, "users"),
        where("role", "==", "employee"),
      );

      const snapshot = await getDocs(staffQuery);

      const employees: StaffMember[] = snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
          uid: doc.id,
          name: data.displayName || "Unnamed Employee",
          email: data.email || "",
          jobRole: data.jobRole || "custom",
          active: data.active === true,
          lastLoginAt: data.lastLoginAt?.toDate
            ? data.lastLoginAt.toDate().toLocaleString()
            : "Never",
        };
      });

      setStaffList(employees);
    } catch (err) {
      console.error("Failed to load staff:", err);
      setError("Unable to load employee list from Firestore.");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    void loadStaff();
  }, []);

  // Change role and automatically apply default permissions
  const handleRoleChange = (role: JobRole) => {
    setSelectedRole(role);

    if (role === "custom") {
      setPermissions(createEmptyPermissions());
    } else {
      setPermissions({
        ...roleDefaults[role],
      });
    }
  };

  // Update individual permissions
  const handlePermissionChange = (
    module: ModuleKey,
    permissionType: "view" | "manage",
    checked: boolean,
  ) => {
    setPermissions((previous) => {
      const updated = {
        ...previous,
        [module]: {
          ...previous[module],
        },
      };

      if (permissionType === "manage") {
        updated[module].manage = checked;

        // Manage ON automatically enables View
        if (checked) {
          updated[module].view = true;
        }
      } else {
        updated[module].view = checked;

        // View OFF automatically disables Manage
        if (!checked) {
          updated[module].manage = false;
        }
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

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("Please login with your Owner account.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Temporary password must contain at least 8 characters.");
      return;
    }

    if (!staffName.trim() || !staffEmail.trim()) {
      setError("Please enter employee name and email.");
      return;
    }

    if (selectedRole === "custom") {
      const hasPermission = modules.some(({ key }) => {
        return permissions[key].view || permissions[key].manage;
      });

      if (!hasPermission) {
        setError("Please select at least one permission for Custom role.");
        return;
      }
    }

    try {
      setLoading(true);

      const idToken = await currentUser.getIdToken();

      const response = await fetch("/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: staffName.trim(),
          email: staffEmail.trim().toLowerCase(),
          password,
          role: selectedRole,
          permissions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to create employee account.");
      }

      setSuccess(
        "Employee account created successfully. Temporary password is ready for first login.",
      );

      resetForm();
      setShowForm(false);

      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const activeStaff = staffList.filter((staff) => staff.active).length;

  const inactiveStaff = staffList.filter((staff) => !staff.active).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Staff Management</h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage employees, roles and permissions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setError("");
            setSuccess("");
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium"
        >
          + Add New Staff
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4">
          {success}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-5">
          <p className="text-sm text-gray-500">Total Staff</p>
          <h2 className="text-3xl font-bold mt-2">{staffList.length}</h2>
        </div>

        <div className="bg-white border rounded-xl p-5">
          <p className="text-sm text-gray-500">Active Staff</p>
          <h2 className="text-3xl font-bold text-green-600 mt-2">
            {activeStaff}
          </h2>
        </div>

        <div className="bg-white border rounded-xl p-5">
          <p className="text-sm text-gray-500">Inactive Staff</p>
          <h2 className="text-3xl font-bold text-red-500 mt-2">
            {inactiveStaff}
          </h2>
        </div>
      </div>

      {/* Add Staff Form */}
      {showForm && (
        <div className="bg-white border rounded-xl p-5 space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Add New Staff Member</h2>

            <p className="text-sm text-gray-500 mt-1">
              Create an employee account and assign permissions.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Full Name
              </label>

              <input
                type="text"
                required
                maxLength={100}
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Enter staff full name"
                className="w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Email Address
              </label>

              <input
                type="email"
                required
                maxLength={254}
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                placeholder="Enter staff email"
                className="w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Temporary Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Temporary Password
                </label>

                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Confirm Password
                </label>

                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Enter password again"
                  className="w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Password will be stored securely by Firebase Authentication, not
              in Firestore.
            </p>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Employee Role
              </label>

              <select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value as JobRole)}
                className="w-full border rounded-lg px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="manager">Manager</option>
                <option value="cashier">Cashier</option>
                <option value="sales_staff">Sales Staff</option>
                <option value="inventory_staff">Inventory Staff</option>
                <option value="custom">Custom</option>
              </select>

              <p className="text-xs text-gray-500 mt-2">
                Selecting a role automatically applies its default permissions.
                You can customize them below.
              </p>
            </div>

            {/* Permissions */}
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-gray-50 p-4 border-b">
                <h3 className="font-semibold text-gray-800">
                  Role Permissions
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  Choose which sections this employee can view or manage.
                </p>
              </div>

              <div className="p-4 space-y-3">
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 border-b pb-3">
                  <div className="col-span-6 sm:col-span-8">MODULE</div>

                  <div className="col-span-3 sm:col-span-2 text-center">
                    VIEW
                  </div>

                  <div className="col-span-3 sm:col-span-2 text-center">
                    MANAGE
                  </div>
                </div>

                {modules.map((module) => (
                  <div
                    key={module.key}
                    className="grid grid-cols-12 gap-2 items-center py-2 border-b last:border-0"
                  >
                    <div className="col-span-6 sm:col-span-8 text-sm font-medium text-gray-700">
                      {module.label}
                    </div>

                    <div className="col-span-3 sm:col-span-2 flex justify-center">
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
                        className="h-4 w-4 accent-blue-600"
                        aria-label={`${module.label} View`}
                      />
                    </div>

                    <div className="col-span-3 sm:col-span-2 flex justify-center">
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
                        className="h-4 w-4 accent-blue-600"
                        aria-label={`${module.label} Manage`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium"
              >
                {loading ? "Creating Account..." : "Create Employee Account"}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                  setError("");
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff List */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold">Staff List</h2>
        </div>

        {listLoading ? (
          <div className="p-10 text-center text-gray-500">
            Loading staff members...
          </div>
        ) : staffList.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-500 font-medium">No staff members found.</p>

            <p className="text-sm text-gray-400 mt-2">
              Add your first staff member to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Email</th>
                  <th className="text-left p-4">Role</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Last Login</th>
                </tr>
              </thead>

              <tbody>
                {staffList.map((staff) => (
                  <tr key={staff.uid} className="border-t">
                    <td className="p-4 font-medium">{staff.name}</td>

                    <td className="p-4">{staff.email}</td>

                    <td className="p-4">
                      {roleLabels[staff.jobRole as JobRole] || staff.jobRole}
                    </td>

                    <td className="p-4">
                      <span
                        className={
                          staff.active
                            ? "text-green-600 font-medium"
                            : "text-red-500 font-medium"
                        }
                      >
                        {staff.active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="p-4 text-gray-500">
                      {staff.lastLoginAt || "Never"}
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
