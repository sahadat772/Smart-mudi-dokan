/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { DEMO_SHOP_SETTINGS } from "./data/mockData";
import {
  Product,
  Customer,
  Supplier,
  Expense,
  Sale,
  Purchase,
  DueCollection,
  CashSession,
  ShopSettings,
  UserRole,
} from "./types";
import { Sidebar, NavPageId } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { MobileNav } from "./components/layout/MobileNav";
import { DemoBanner } from "./components/common/DemoBanner";
import { ReceiptModal } from "./components/pos/ReceiptModal";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { apiFetch } from "./api/client";

import { DashboardPage } from "./pages/Dashboard/DashboardPage";
import { PosPage } from "./pages/POS/PosPage";
import { ProductsPage } from "./pages/Products/ProductsPage";
import { CustomersPage } from "./pages/Customers/CustomersPage";
import { PurchasesPage } from "./pages/Purchases/PurchasesPage";
import { ExpensesPage } from "./pages/Expenses/ExpensesPage";
import { CashManagementPage } from "./pages/CashManagement/CashManagementPage";
import { ReportsPage } from "./pages/Reports/ReportsPage";
import { SettingsPage } from "./pages/Settings/SettingsPage";
import { LoginPage } from "./pages/Login/LoginPage";
import StaffManagement from "./pages/Staff/StaffManagement";
import { ChangePasswordPage } from "./pages/ChangePassword/ChangePasswordPage";

const emptyCash: CashSession = {
  date: new Date().toISOString().slice(0, 10),
  openingCash: 0,
  cashSales: 0,
  cashDueCollected: 0,
  cashSupplierPaid: 0,
  cashExpenses: 0,
  expectedClosingCash: 0,
  bKashBalance: 0,
  nagadBalance: 0,
  bankBalance: 0,
  isClosed: false,
};

export default function App() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState<NavPageId>("dashboard");
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [userPermissions, setUserPermissions] = useState<
    Record<string, { view: boolean; manage: boolean }>
  >({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dueCollections, setDueCollections] = useState<DueCollection[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashSession, setCashSession] = useState<CashSession>(emptyCash);
  const [shopSettings, setShopSettings] = useState<ShopSettings>(DEMO_SHOP_SETTINGS);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const clearAuthState = useCallback(() => {
    setAuthUser(null);
    setCurrentRole(null);
    setMustChangePassword(false);
    setUserPermissions({});
    setDisplayName(undefined);
    setCurrentPage("dashboard");
    setIsMobileMenuOpen(false);
    setProducts([]);
    setRecentSales([]);
    setCustomers([]);
    setDueCollections([]);
    setSuppliers([]);
    setExpenses([]);
    setCashSession(emptyCash);
    setProductsError(null);
  }, []);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const data = await apiFetch<{ products: Product[] }>("/api/products");
      setProducts(data.products || []);
    } catch (error) {
      console.error("Failed to load products:", error);
      setProductsError(error instanceof Error ? error.message : "পণ্য লোড করা যায়নি।");
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadSales = useCallback(async () => {
    try {
      const data = await apiFetch<{ sales: Sale[] }>("/api/sales?limit=30");
      setRecentSales(data.sales || []);
    } catch (error) {
      console.error("Failed to load sales:", error);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const data = await apiFetch<{ customers: Customer[] }>("/api/customers");
      setCustomers(data.customers || []);
    } catch (error) {
      console.error("Failed to load customers:", error);
      setCustomers([]);
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const data = await apiFetch<{ suppliers: Supplier[] }>("/api/purchases/suppliers");
      setSuppliers(data.suppliers || []);
    } catch (error) {
      console.error("Failed to load suppliers:", error);
      setSuppliers([]);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    try {
      const data = await apiFetch<{ expenses: Expense[] }>("/api/expenses");
      setExpenses(data.expenses || []);
    } catch (error) {
      console.error("Failed to load expenses:", error);
      setExpenses([]);
    }
  }, []);

  const loadCashSession = useCallback(async () => {
    try {
      const data = await apiFetch<{ session: CashSession }>("/api/cash/today");
      if (data.session) setCashSession(data.session);
    } catch (error) {
      console.error("Failed to load cash session:", error);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      clearAuthState();
    }
  }, [clearAuthState]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        clearAuthState();
        setAuthLoading(false);
        return;
      }
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (!userSnap.exists()) {
          await signOut(auth);
          clearAuthState();
          return;
        }
        const userData = userSnap.data();
        if (userData.active !== true || (userData.role !== "owner" && userData.role !== "employee")) {
          await signOut(auth);
          clearAuthState();
          return;
        }
        const needsPasswordChange = userData.role === "employee" && userData.mustChangePassword === true;
        setCurrentRole(userData.role as UserRole);
        setMustChangePassword(needsPasswordChange);
        setDisplayName(typeof userData.displayName === "string" ? userData.displayName : undefined);
        setUserPermissions(userData.role === "employee" && userData.permissions ? userData.permissions : {});
        setAuthUser(user);
        setCurrentPage(needsPasswordChange ? "change-password" : "dashboard");
      } catch (error) {
        console.error("Authentication verification failed:", error);
        await signOut(auth);
        clearAuthState();
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, [clearAuthState]);

  useEffect(() => {
    if (!authUser || !currentRole || mustChangePassword) return;
    void loadProducts();
    void loadSales();
    void loadCustomers();
    void loadSuppliers();
    void loadExpenses();
    void loadCashSession();
  }, [
    authUser,
    currentRole,
    mustChangePassword,
    loadProducts,
    loadSales,
    loadCustomers,
    loadSuppliers,
    loadExpenses,
    loadCashSession,
  ]);

  const canAccessPage = (page: NavPageId): boolean => {
    if (currentRole === "owner") return true;
    if (page === "staff" || page === "settings" || page === "login") return false;
    if (page === "change-password") return mustChangePassword;
    return userPermissions[page]?.view === true;
  };

  useEffect(() => {
    if (!currentRole) return;
    if (mustChangePassword) {
      setCurrentPage("change-password");
      return;
    }
    if (!canAccessPage(currentPage)) setCurrentPage("dashboard");
  }, [currentRole, currentPage, userPermissions, mustChangePassword]);

  const lowStockCount = products.filter((p) => p.stockQuantity <= p.lowStockThreshold).length;

  const handleCompleteSale = (newSale: Sale, updatedProducts?: { id: string; stockQuantity: number }[]) => {
    setRecentSales((prev) => [newSale, ...prev]);
    if (updatedProducts?.length) {
      setProducts((prev) =>
        prev.map((prod) => {
          const match = updatedProducts.find((u) => u.id === prod.id);
          return match ? { ...prod, stockQuantity: match.stockQuantity } : prod;
        }),
      );
    }
    if (newSale.customerId && newSale.dueAmount > 0) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === newSale.customerId
            ? {
                ...c,
                currentDue: c.currentDue + newSale.dueAmount,
                totalPurchased: c.totalPurchased + newSale.grandTotal,
                lastTransactionDate: newSale.createdAt,
              }
            : c,
        ),
      );
    }
    const cashPaid = newSale.payments
      .filter((p) => p.method === "নগদ (Cash)")
      .reduce((s, p) => s + p.amount, 0);
    if (cashPaid > 0) {
      setCashSession((prev) => ({
        ...prev,
        cashSales: prev.cashSales + cashPaid,
        expectedClosingCash: prev.expectedClosingCash + cashPaid,
      }));
    }
    setReceiptSale(newSale);
    setIsReceiptOpen(true);
  };

  const handleAddProduct = (newProduct: Product) => setProducts((prev) => [newProduct, ...prev]);
  const handleUpdateProduct = (updated: Product) =>
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  const handleAddCustomer = (newCustomer: Customer) => setCustomers((prev) => [newCustomer, ...prev]);

  const handleCollectDue = (collection: DueCollection, updatedCustomer?: Customer) => {
    setDueCollections((prev) => [collection, ...prev]);
    if (updatedCustomer) {
      setCustomers((prev) => prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c)));
    } else {
      setCustomers((prev) =>
        prev.map((cust) =>
          cust.id === collection.customerId
            ? {
                ...cust,
                currentDue: collection.remainingDue,
                totalPaid: cust.totalPaid + collection.amount,
                lastTransactionDate: collection.date,
              }
            : cust,
        ),
      );
    }
    if (collection.paymentMethod === "নগদ (Cash)") {
      setCashSession((prev) => ({
        ...prev,
        cashDueCollected: prev.cashDueCollected + collection.amount,
        expectedClosingCash: prev.expectedClosingCash + collection.amount,
      }));
    }
  };

  const handleAddSupplier = (newSupplier: Supplier) => setSuppliers((prev) => [newSupplier, ...prev]);
  const handleUpdateSupplier = (updated: Supplier) =>
    setSuppliers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

  const handleAddPurchase = (
    purchase: Purchase,
    extras?: {
      supplier?: Supplier;
      updatedProduct?: { id: string; stockQuantity: number; costPrice?: number };
    },
  ) => {
    if (extras?.updatedProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === extras.updatedProduct!.id
            ? {
                ...p,
                stockQuantity: extras.updatedProduct!.stockQuantity,
                costPrice: extras.updatedProduct!.costPrice ?? p.costPrice,
              }
            : p,
        ),
      );
    }
    if (extras?.supplier) {
      setSuppliers((prev) => prev.map((s) => (s.id === extras.supplier!.id ? extras.supplier! : s)));
    }
    if (purchase.paymentMethod === "নগদ (Cash)" && purchase.paidAmount > 0) {
      setCashSession((prev) => ({
        ...prev,
        cashSupplierPaid: prev.cashSupplierPaid + purchase.paidAmount,
        expectedClosingCash: prev.expectedClosingCash - purchase.paidAmount,
      }));
    }
  };

  const handleAddExpense = (expense: Expense) => {
    setExpenses((prev) => [expense, ...prev]);
    if (expense.paymentMethod === "নগদ (Cash)") {
      setCashSession((prev) => ({
        ...prev,
        cashExpenses: prev.cashExpenses + expense.amount,
        expectedClosingCash: prev.expectedClosingCash - expense.amount,
      }));
    }
  };

  const handleUpdateActualCash = (amount: number) => {
    setCashSession((prev) => ({
      ...prev,
      actualClosingCash: amount,
      discrepancy: amount - prev.expectedClosingCash,
      isClosed: true,
    }));
  };

  const handleSelectSaleForReceipt = (sale: Sale) => {
    setReceiptSale(sale);
    setIsReceiptOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="text-lg font-bold text-slate-800">Smart Mudi Manager</div>
          <p className="text-sm text-slate-500 mt-2">অ্যাকাউন্ট যাচাই হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!authUser || !currentRole) {
    return (
      <LoginPage
        currentRole="owner"
        onLoginSuccess={(role, needsPasswordChange) => {
          setCurrentRole(role);
          setMustChangePassword(needsPasswordChange);
          setCurrentPage(needsPasswordChange ? "change-password" : "dashboard");
        }}
      />
    );
  }

  if (mustChangePassword && currentRole === "employee") {
    return (
      <ChangePasswordPage
        onPasswordChanged={() => {
          setMustChangePassword(false);
          setCurrentPage("dashboard");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <DemoBanner />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentPage={currentPage}
          onNavigate={(page) => setCurrentPage(page)}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          currentRole={currentRole}
          permissions={userPermissions}
          lowStockCount={lowStockCount}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-20 lg:pb-8">
          <Topbar
            currentRole={currentRole}
            displayName={displayName}
            onLogout={handleLogout}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            lowStockCount={lowStockCount}
            onNavigateToLowStock={() => setCurrentPage("products")}
            shopName={shopSettings.shopName}
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {productsError && (
              <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                পণ্য লোড সমস্যা: {productsError}
                <button type="button" onClick={() => void loadProducts()} className="ml-2 underline font-medium">
                  আবার চেষ্টা
                </button>
              </div>
            )}
            {currentPage === "dashboard" && (
              <DashboardPage
                products={products}
                recentSales={recentSales}
                currentRole={currentRole}
                onNavigate={(page) => setCurrentPage(page)}
                onSelectSaleForReceipt={handleSelectSaleForReceipt}
              />
            )}
            {currentPage === "staff" && currentRole === "owner" && <StaffManagement />}
            {currentPage === "pos" && (
              <PosPage
                products={products}
                customers={customers}
                currentRole={currentRole}
                permissions={
                  currentRole === "owner"
                    ? { view: true, manage: true }
                    : (userPermissions.pos ?? { view: false, manage: false })
                }
                onCompleteSale={handleCompleteSale}
                shopName={shopSettings.shopName}
              />
            )}
            {currentPage === "products" && (
              <ProductsPage
                products={products}
                loading={productsLoading}
                currentRole={currentRole}
                permissions={
                  currentRole === "owner"
                    ? { view: true, manage: true }
                    : (userPermissions.products ?? { view: false, manage: false })
                }
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onReload={loadProducts}
              />
            )}
            {currentPage === "customers" && (
              <CustomersPage
                customers={customers}
                dueCollections={dueCollections}
                currentRole={currentRole}
                permissions={
                  currentRole === "owner"
                    ? { view: true, manage: true }
                    : (userPermissions.customers ?? { view: false, manage: false })
                }
                onAddCustomer={handleAddCustomer}
                onCollectDue={handleCollectDue}
                onCollectionsLoaded={(list) => setDueCollections(list)}
              />
            )}
            {currentPage === "purchases" && (
              <PurchasesPage
                suppliers={suppliers}
                products={products}
                currentRole={currentRole}
                permissions={
                  currentRole === "owner"
                    ? { view: true, manage: true }
                    : (userPermissions.purchases ?? { view: false, manage: false })
                }
                onAddSupplier={handleAddSupplier}
                onAddPurchase={handleAddPurchase}
                onUpdateSupplier={handleUpdateSupplier}
                onReloadSuppliers={loadSuppliers}
              />
            )}
            {currentPage === "expenses" && (
              <ExpensesPage
                expenses={expenses}
                currentRole={currentRole}
                permissions={
                  currentRole === "owner"
                    ? { view: true, manage: true }
                    : (userPermissions.expenses ?? { view: false, manage: false })
                }
                onAddExpense={handleAddExpense}
                onReload={loadExpenses}
              />
            )}
            {currentPage === "cash" && (
              <CashManagementPage
                cashSession={cashSession}
                currentRole={currentRole}
                permissions={
                  currentRole === "owner"
                    ? { view: true, manage: true }
                    : (userPermissions.cash ?? { view: false, manage: false })
                }
                onUpdateActualCash={handleUpdateActualCash}
                onSessionUpdated={setCashSession}
                onReload={loadCashSession}
              />
            )}
            {currentPage === "reports" && canAccessPage("reports") && (
              <ReportsPage
                currentRole={currentRole}
                permissions={
                  currentRole === "owner"
                    ? { view: true, manage: true }
                    : (userPermissions.reports ?? { view: false, manage: false })
                }
              />
            )}
            {currentPage === "settings" && currentRole === "owner" && (
              <SettingsPage
                settings={shopSettings}
                onUpdateSettings={(s) => setShopSettings(s)}
                currentRole={currentRole}
                permissions={{ view: true, manage: true }}
              />
            )}
          </main>
        </div>
      </div>
      <MobileNav
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={receiptSale}
        shopSettings={shopSettings}
      />
    </div>
  );
}
