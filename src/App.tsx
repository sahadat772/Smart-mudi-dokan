/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  DEMO_PRODUCTS,
  DEMO_CUSTOMERS,
  DEMO_SUPPLIERS,
  DEMO_EXPENSES,
  DEMO_RECENT_SALES,
  DEMO_DUE_COLLECTIONS,
  DEMO_CASH_SESSION,
  DEMO_SHOP_SETTINGS,
} from "./data/mockData";
import {
  Product,
  Customer,
  Supplier,
  Expense,
  Sale,
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

  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [customers, setCustomers] = useState<Customer[]>(DEMO_CUSTOMERS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(DEMO_SUPPLIERS);
  const [expenses, setExpenses] = useState<Expense[]>(DEMO_EXPENSES);
  const [recentSales, setRecentSales] = useState<Sale[]>(DEMO_RECENT_SALES);
  const [dueCollections, setDueCollections] =
    useState<DueCollection[]>(DEMO_DUE_COLLECTIONS);
  const [cashSession, setCashSession] =
    useState<CashSession>(DEMO_CASH_SESSION);
  const [shopSettings, setShopSettings] =
    useState<ShopSettings>(DEMO_SHOP_SETTINGS);

  const [receiptSale, setReceiptSale] = useState<Sale | null>(
    DEMO_RECENT_SALES[0],
  );
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const clearAuthState = useCallback(() => {
    setAuthUser(null);
    setCurrentRole(null);
    setMustChangePassword(false);
    setUserPermissions({});
    setDisplayName(undefined);
    setCurrentPage("dashboard");
    setIsMobileMenuOpen(false);
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
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await signOut(auth);
          clearAuthState();
          return;
        }

        const userData = userSnap.data();

        if (
          userData.active !== true ||
          (userData.role !== "owner" && userData.role !== "employee")
        ) {
          await signOut(auth);
          clearAuthState();
          return;
        }

        const needsPasswordChange =
          userData.role === "employee" && userData.mustChangePassword === true;

        setCurrentRole(userData.role as UserRole);
        setMustChangePassword(needsPasswordChange);
        setDisplayName(
          typeof userData.displayName === "string"
            ? userData.displayName
            : undefined,
        );
        setUserPermissions(
          userData.role === "employee" && userData.permissions
            ? userData.permissions
            : {},
        );
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

  const canAccessPage = (page: NavPageId): boolean => {
    if (currentRole === "owner") return true;

    if (page === "staff" || page === "settings" || page === "login") {
      return false;
    }

    if (page === "change-password") {
      return mustChangePassword;
    }

    return userPermissions[page]?.view === true;
  };

  useEffect(() => {
    if (!currentRole) return;
    if (mustChangePassword) {
      setCurrentPage("change-password");
      return;
    }
    if (!canAccessPage(currentPage)) {
      setCurrentPage("dashboard");
    }
  }, [currentRole, currentPage, userPermissions, mustChangePassword]);

  const lowStockCount = products.filter(
    (p) => p.stockQuantity <= p.lowStockThreshold,
  ).length;

  const handleCompleteSale = (newSale: Sale) => {
    setRecentSales([newSale, ...recentSales]);

    setProducts((prev) =>
      prev.map((prod) => {
        const itemInSale = newSale.items.find(
          (item) => item.product.id === prod.id,
        );
        if (itemInSale) {
          return {
            ...prod,
            stockQuantity: Math.max(
              0,
              prod.stockQuantity - itemInSale.quantity,
            ),
          };
        }
        return prod;
      }),
    );

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

  const handleAddProduct = (newProduct: Product) => {
    setProducts([newProduct, ...products]);
  };

  const handleUpdateProduct = (updated: Product) => {
    setProducts(products.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleAddCustomer = (newCustomer: Customer) => {
    setCustomers([newCustomer, ...customers]);
  };

  const handleCollectDue = (collection: DueCollection) => {
    setDueCollections([collection, ...dueCollections]);

    setCustomers((prev) =>
      prev.map((cust) => {
        if (cust.id === collection.customerId) {
          return {
            ...cust,
            currentDue: collection.remainingDue,
            totalPaid: cust.totalPaid + collection.amount,
            lastTransactionDate: collection.date,
          };
        }
        return cust;
      }),
    );

    if (collection.paymentMethod === "নগদ (Cash)") {
      setCashSession((prev) => ({
        ...prev,
        cashDueCollected: prev.cashDueCollected + collection.amount,
        expectedClosingCash: prev.expectedClosingCash + collection.amount,
      }));
    }
  };

  const handleAddSupplier = (newSupplier: Supplier) => {
    setSuppliers([newSupplier, ...suppliers]);
  };

  const handleAddPurchase = (purchase: any) => {
    setProducts((prev) =>
      prev.map((p) => {
        const item = purchase.items[0];
        if (item && p.id === item.productId) {
          return {
            ...p,
            stockQuantity: p.stockQuantity + item.quantity,
            costPrice: item.costPrice,
          };
        }
        return p;
      }),
    );

    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === purchase.supplierId) {
          return {
            ...s,
            totalSupplied: s.totalSupplied + purchase.totalAmount,
            totalPaid: s.totalPaid + purchase.paidAmount,
            outstandingBalance: s.outstandingBalance + purchase.dueAmount,
            lastPurchaseDate: purchase.date,
          };
        }
        return s;
      }),
    );
  };

  const handleAddExpense = (expense: Expense) => {
    setExpenses([expense, ...expenses]);

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
          <div className="text-lg font-bold text-slate-800">
            Smart Mudi Manager
          </div>
          <p className="text-sm text-slate-500 mt-2">
            অ্যাকাউন্ট যাচাই হচ্ছে...
          </p>
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

  // Mandatory first-login password change blocks the rest of the app.
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
            {currentPage === "dashboard" && (
              <DashboardPage
                products={products}
                recentSales={recentSales}
                currentRole={currentRole}
                onNavigate={(page) => setCurrentPage(page)}
                onSelectSaleForReceipt={handleSelectSaleForReceipt}
              />
            )}

            {currentPage === "staff" && currentRole === "owner" && (
              <StaffManagement />
            )}

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
                currentRole={currentRole}
                permissions={
                  currentRole === "owner"
                    ? { view: true, manage: true }
                    : (userPermissions.products ?? {
                        view: false,
                        manage: false,
                      })
                }
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
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
                    : (userPermissions.customers ?? {
                        view: false,
                        manage: false,
                      })
                }
                onAddCustomer={handleAddCustomer}
                onCollectDue={handleCollectDue}
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
                    : (userPermissions.purchases ?? {
                        view: false,
                        manage: false,
                      })
                }
                onAddSupplier={handleAddSupplier}
                onAddPurchase={handleAddPurchase}
              />
            )}

            {currentPage === "expenses" && (
              <ExpensesPage
                expenses={expenses}
                currentRole={currentRole}
                permissions={
                  currentRole === "owner"
                    ? { view: true, manage: true }
                    : (userPermissions.expenses ?? {
                        view: false,
                        manage: false,
                      })
                }
                onAddExpense={handleAddExpense}
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
              />
            )}

            {currentPage === "reports" && canAccessPage("reports") && (
              <ReportsPage
                currentRole={currentRole}
                permissions={
                  currentRole === "owner"
                    ? { view: true, manage: true }
                    : (userPermissions.reports ?? {
                        view: false,
                        manage: false,
                      })
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
