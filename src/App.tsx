/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  DEMO_PRODUCTS,
  DEMO_CUSTOMERS,
  DEMO_SUPPLIERS,
  DEMO_EXPENSES,
  DEMO_RECENT_SALES,
  DEMO_DUE_COLLECTIONS,
  DEMO_CASH_SESSION,
  DEMO_SHOP_SETTINGS,
} from './data/mockData';
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
} from './types';
import { Sidebar, NavPageId } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { MobileNav } from './components/layout/MobileNav';
import { DemoBanner } from './components/common/DemoBanner';
import { ReceiptModal } from './components/pos/ReceiptModal';

// Pages
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { PosPage } from './pages/POS/PosPage';
import { ProductsPage } from './pages/Products/ProductsPage';
import { CustomersPage } from './pages/Customers/CustomersPage';
import { PurchasesPage } from './pages/Purchases/PurchasesPage';
import { ExpensesPage } from './pages/Expenses/ExpensesPage';
import { CashManagementPage } from './pages/CashManagement/CashManagementPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { LoginPage } from './pages/Login/LoginPage';

export default function App() {
  // Navigation & Role
  const [currentPage, setCurrentPage] = useState<NavPageId>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('owner');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core Data States
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [customers, setCustomers] = useState<Customer[]>(DEMO_CUSTOMERS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(DEMO_SUPPLIERS);
  const [expenses, setExpenses] = useState<Expense[]>(DEMO_EXPENSES);
  const [recentSales, setRecentSales] = useState<Sale[]>(DEMO_RECENT_SALES);
  const [dueCollections, setDueCollections] = useState<DueCollection[]>(
    DEMO_DUE_COLLECTIONS
  );
  const [cashSession, setCashSession] = useState<CashSession>(DEMO_CASH_SESSION);
  const [shopSettings, setShopSettings] = useState<ShopSettings>(
    DEMO_SHOP_SETTINGS
  );

  // Receipt Modal State
  const [receiptSale, setReceiptSale] = useState<Sale | null>(DEMO_RECENT_SALES[0]);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Derived low stock counter
  const lowStockCount = products.filter(
    (p) => p.stockQuantity <= p.lowStockThreshold
  ).length;

  // Handlers for interactive prototype demonstrations
  const handleCompleteSale = (newSale: Sale) => {
    setRecentSales([newSale, ...recentSales]);

    // Decrease in-memory stock for prototype session
    setProducts((prev) =>
      prev.map((prod) => {
        const itemInSale = newSale.items.find(
          (item) => item.product.id === prod.id
        );
        if (itemInSale) {
          return {
            ...prod,
            stockQuantity: Math.max(0, prod.stockQuantity - itemInSale.quantity),
          };
        }
        return prod;
      })
    );

    // If sale includes cash, update cash session
    const cashPaid = newSale.payments
      .filter((p) => p.method === 'নগদ (Cash)')
      .reduce((s, p) => s + p.amount, 0);

    if (cashPaid > 0) {
      setCashSession((prev) => ({
        ...prev,
        cashSales: prev.cashSales + cashPaid,
        expectedClosingCash: prev.expectedClosingCash + cashPaid,
      }));
    }

    // Open receipt modal
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

    // Update customer's current due and total paid
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
      })
    );

    // If collected via cash, increase cash session
    if (collection.paymentMethod === 'নগদ (Cash)') {
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
    // Increase stock of product
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
      })
    );

    // Update supplier balance
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
      })
    );
  };

  const handleAddExpense = (expense: Expense) => {
    setExpenses([expense, ...expenses]);

    // If paid via cash, reduce cash session
    if (expense.paymentMethod === 'নগদ (Cash)') {
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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Banner indicating Prototype / Demo State */}
      <DemoBanner />

      <div className="flex-1 flex overflow-hidden">
        {/* Persistent Desktop Sidebar & Drawer for Mobile */}
        <Sidebar
          currentPage={currentPage}
          onNavigate={(page) => setCurrentPage(page)}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          currentRole={currentRole}
          lowStockCount={lowStockCount}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-20 lg:pb-8">
          <Topbar
            currentRole={currentRole}
            onRoleChange={(role) => setCurrentRole(role)}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            lowStockCount={lowStockCount}
            onNavigateToLowStock={() => setCurrentPage('products')}
            shopName={shopSettings.shopName}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {currentPage === 'dashboard' && (
              <DashboardPage
                products={products}
                recentSales={recentSales}
                currentRole={currentRole}
                onNavigate={(page) => setCurrentPage(page)}
                onSelectSaleForReceipt={handleSelectSaleForReceipt}
              />
            )}

            {currentPage === 'pos' && (
              <PosPage
                products={products}
                customers={customers}
                currentRole={currentRole}
                onCompleteSale={handleCompleteSale}
                shopName={shopSettings.shopName}
              />
            )}

            {currentPage === 'products' && (
              <ProductsPage
                products={products}
                currentRole={currentRole}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
              />
            )}

            {currentPage === 'customers' && (
              <CustomersPage
                customers={customers}
                dueCollections={dueCollections}
                currentRole={currentRole}
                onAddCustomer={handleAddCustomer}
                onCollectDue={handleCollectDue}
              />
            )}

            {currentPage === 'purchases' && (
              <PurchasesPage
                suppliers={suppliers}
                products={products}
                currentRole={currentRole}
                onAddSupplier={handleAddSupplier}
                onAddPurchase={handleAddPurchase}
              />
            )}

            {currentPage === 'expenses' && (
              <ExpensesPage
                expenses={expenses}
                currentRole={currentRole}
                onAddExpense={handleAddExpense}
              />
            )}

            {currentPage === 'cash' && (
              <CashManagementPage
                cashSession={cashSession}
                currentRole={currentRole}
                onUpdateActualCash={handleUpdateActualCash}
              />
            )}

            {currentPage === 'reports' && (
              <ReportsPage currentRole={currentRole} />
            )}

            {currentPage === 'settings' && (
              <SettingsPage
                settings={shopSettings}
                onUpdateSettings={(s) => setShopSettings(s)}
                currentRole={currentRole}
              />
            )}

            {currentPage === 'login' && (
              <LoginPage
                onLoginSuccess={(role) => {
                  setCurrentRole(role);
                  setCurrentPage('dashboard');
                }}
                currentRole={currentRole}
              />
            )}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Thumb Navigation */}
      <MobileNav
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Printable 80mm Cash Memo Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={receiptSale}
        shopSettings={shopSettings}
      />
    </div>
  );
}
