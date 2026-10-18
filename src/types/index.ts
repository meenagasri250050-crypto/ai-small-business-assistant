export interface UserProfile {
  uid: string;
  name: string;
  shopName: string;
  email: string;
  address?: string;
  phone?: string;
  currency: string; // Defaults to '₹'
  gstNumber?: string;
  receiptNote?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  sku: string;
  category: string;
  purchaseCost: number; // Cost price per unit
  sellingPrice: number; // Retail selling price per unit
  currentStock: number;
  lowStockThreshold: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockPurchase {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  quantity: number;
  purchaseCostPerUnit: number;
  totalCost: number;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface InvoiceLineItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitSellingPrice: number;
  unitPurchaseCost: number; // Historical snapshot
  lineTotal: number;
}

export interface Invoice {
  id: string;
  userId: string;
  invoiceNumber: string;
  customerName?: string;
  customerPhone?: string;
  items: InvoiceLineItem[];
  totalUnits: number;
  subtotal: number;
  discount: number; // Fixed amount discount
  totalAmount: number;
  totalCOGS: number; // Cost of goods sold snapshot
  grossProfit: number; // totalAmount - totalCOGS
  paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Other';
  status: 'completed' | 'cancelled' | 'refunded';
  notes?: string;
  date: string; // ISO date string or YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  userId: string;
  title: string;
  category: 'Rent' | 'Electricity' | 'Transport' | 'Packaging' | 'Salaries' | 'Marketing' | 'Maintenance' | 'Other';
  amount: number;
  date: string; // YYYY-MM-DD
  description?: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitSellingPrice: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface ProfitLossReport {
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalInvoices: number;
  totalUnitsSold: number;
  salesRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossMarginPct: number;
  operatingExpenses: number;
  netProfit: number;
  netMarginPct: number;
  isLoss: boolean;
  topContributingProducts: {
    productName: string;
    unitsSold: number;
    revenue: number;
    cogs: number;
    profit: number;
  }[];
}
