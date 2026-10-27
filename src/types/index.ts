/**
 * Smart Mudi Manager (স্মার্ট মুদি ম্যানেজার) - Data Types
 * Phase 1: Frontend prototype models prepared for future Firebase / Cloud Firestore integration
 */

export type UserRole = 'owner' | 'employee';

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  assignedBranch?: string;
}

export type ProductCategory = 
  | 'চাল ও ডাল'
  | 'তেল ও ঘি'
  | 'মসলা ও গুঁড়া'
  | 'বিস্কুট ও স্ন্যাক্স'
  | 'চা, কফি ও পানীয়'
  | 'সাবান ও প্রসাধন'
  | 'দুগ্ধজাত পণ্য ও ডিম'
  | 'পরিষ্কারক সামগ্রী'
  | 'অন্যান্য';

export type ProductUnit = 'কেজি' | 'গ্রাম' | 'লিটার' | 'মিলি' | 'প্যাকেট' | 'পিস' | 'ডজন' | 'বস্তা' | 'কার্টুন';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  unit: ProductUnit;
  sku: string;
  barcode?: string;
  costPrice: number;    // ক্রয়মূল্য (টাকা)
  sellingPrice: number; // বিক্রয়মূল্য (টাকা)
  stockQuantity: number;
  lowStockThreshold: number;
  shelfLocation?: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  costAtSale: number; // Accounting rule: sale preserves cost basis for COGS & gross profit
}

export type PaymentMethod = 'নগদ (Cash)' | 'বিকাশ (bKash)' | 'নগদ (Nagad)' | 'ব্যাংক / কার্ড (Bank)';

export interface PaymentSplit {
  method: PaymentMethod;
  amount: number;
  transactionRef?: string;
}

export type SaleStatus = 'completed' | 'returned' | 'cancelled';

export interface Sale {
  id: string;
  invoiceNo: string;
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  payments: PaymentSplit[];
  status: SaleStatus;
  soldBy: string; // Employee or Owner name
  cogsTotal: number; // Total cost of goods sold
  grossProfit: number; // grandTotal - cogsTotal
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  totalPurchased: number;
  totalPaid: number;
  currentDue: number; // বাকির স্থিতি
  lastTransactionDate: string;
}

export interface DueCollection {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  note?: string;
  collectedBy: string;
  previousDue: number;
  remainingDue: number;
}

export interface Supplier {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  address?: string;
  totalSupplied: number;
  totalPaid: number;
  outstandingBalance: number; // মহাজনের দেনা
  lastPurchaseDate: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  unit: ProductUnit;
  quantity: number;
  costPrice: number;
  total: number;
}

export interface Purchase {
  id: string;
  invoiceNo: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  receivedBy: string;
  status: 'received' | 'partial' | 'due';
}

export type ExpenseCategory = 
  | 'দোকান ভাড়া'
  | 'বিদ্যুৎ বিল'
  | 'কর্মচারীর বেতন'
  | 'মালামাল পরিবহন'
  | 'দোকান রক্ষণাবেক্ষণ'
  | 'চা ও আপ্যায়ন'
  | 'প্যাকেজিং ও ব্যাগ'
  | 'অন্যান্য খরচ';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  note?: string;
  recordedBy: string;
}

export interface CashSession {
  date: string;
  openingCash: number;
  cashSales: number;
  cashDueCollected: number;
  cashSupplierPaid: number;
  cashExpenses: number;
  expectedClosingCash: number;
  actualClosingCash?: number;
  discrepancy?: number;
  bKashBalance: number;
  nagadBalance: number;
  bankBalance: number;
  isClosed: boolean;
}

export interface ShopSettings {
  shopName: string;
  tagline: string;
  proprietorName: string;
  phone: string;
  secondaryPhone?: string;
  address: string;
  vatNumber?: string;
  receiptFooterMsg: string;
  currencySymbol: string;
}
