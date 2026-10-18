import { Product, Invoice, Expense, UserProfile } from '../types';

export interface BusinessAIContext {
  shopName: string;
  currency: string;
  ownerName: string;
  totalProducts: number;
  totalUnitsInStock: number;
  inventoryCostValue: number;
  potentialRetailValue: number;
  potentialGrossProfit: number;
  lowStockItems: { name: string; sku: string; currentStock: number; threshold: number }[];
  outOfStockItems: { name: string; sku: string }[];
  todaySales: {
    revenue: number;
    grossProfit: number;
    invoiceCount: number;
    unitsSold: number;
  };
  weeklySales: {
    revenue: number;
    grossProfit: number;
    invoiceCount: number;
  };
  monthlySales: {
    revenue: number;
    grossProfit: number;
    invoiceCount: number;
  };
  allTimeSales: {
    revenue: number;
    grossProfit: number;
    cogs: number;
    invoicesCount: number;
  };
  operatingExpenses: {
    total: number;
    byCategory: Record<string, number>;
  };
  netProfit: number;
  bestSellingProducts: { name: string; unitsSold: number; totalRevenue: number; grossProfit: number }[];
}

export function compileBusinessContext(
  profile: UserProfile | null,
  products: Product[],
  invoices: Invoice[],
  expenses: Expense[]
): BusinessAIContext {
  const currency = profile?.currency || '₹';
  const shopName = profile?.shopName || 'My Retail Shop';
  const ownerName = profile?.name || 'Shop Owner';

  // Products metrics
  let totalUnitsInStock = 0;
  let inventoryCostValue = 0;
  let potentialRetailValue = 0;
  const lowStockItems: { name: string; sku: string; currentStock: number; threshold: number }[] = [];
  const outOfStockItems: { name: string; sku: string }[] = [];

  for (const p of products) {
    totalUnitsInStock += p.currentStock;
    inventoryCostValue += p.currentStock * p.purchaseCost;
    potentialRetailValue += p.currentStock * p.sellingPrice;

    if (p.currentStock === 0) {
      outOfStockItems.push({ name: p.name, sku: p.sku });
    } else if (p.currentStock <= p.lowStockThreshold) {
      lowStockItems.push({ name: p.name, sku: p.sku, currentStock: p.currentStock, threshold: p.lowStockThreshold });
    }
  }

  const potentialGrossProfit = potentialRetailValue - inventoryCostValue;

  // Invoices & Time calculations
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(now.getDate() - 7);
  const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];

  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(now.getDate() - 30);
  const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];

  const completedInvoices = invoices.filter(inv => inv.status === 'completed');

  const todayInvoices = completedInvoices.filter(inv => inv.date === todayStr);
  const weeklyInvoices = completedInvoices.filter(inv => inv.date >= oneWeekAgoStr);
  const monthlyInvoices = completedInvoices.filter(inv => inv.date >= oneMonthAgoStr);

  const calculateSalesSummary = (invList: Invoice[]) => {
    return {
      revenue: invList.reduce((acc, inv) => acc + inv.totalAmount, 0),
      grossProfit: invList.reduce((acc, inv) => acc + inv.grossProfit, 0),
      invoiceCount: invList.length,
      unitsSold: invList.reduce((acc, inv) => acc + inv.totalUnits, 0),
    };
  };

  const todaySummary = calculateSalesSummary(todayInvoices);
  const weeklySummary = calculateSalesSummary(weeklyInvoices);
  const monthlySummary = calculateSalesSummary(monthlyInvoices);

  // All time
  const allTimeRevenue = completedInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const allTimeGrossProfit = completedInvoices.reduce((acc, inv) => acc + inv.grossProfit, 0);
  const allTimeCOGS = completedInvoices.reduce((acc, inv) => acc + inv.totalCOGS, 0);

  // Expenses
  let totalExpenses = 0;
  const expensesByCategory: Record<string, number> = {};
  for (const exp of expenses) {
    totalExpenses += exp.amount;
    expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amount;
  }

  const netProfit = allTimeGrossProfit - totalExpenses;

  // Product sales aggregation
  const productAggMap = new Map<string, { name: string; unitsSold: number; totalRevenue: number; grossProfit: number }>();
  for (const inv of completedInvoices) {
    for (const item of inv.items) {
      const existing = productAggMap.get(item.productId) || {
        name: item.productName,
        unitsSold: 0,
        totalRevenue: 0,
        grossProfit: 0,
      };
      existing.unitsSold += item.quantity;
      existing.totalRevenue += item.lineTotal;
      existing.grossProfit += (item.unitSellingPrice - item.unitPurchaseCost) * item.quantity;
      productAggMap.set(item.productId, existing);
    }
  }

  const bestSellingProducts = Array.from(productAggMap.values())
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 10);

  return {
    shopName,
    currency,
    ownerName,
    totalProducts: products.length,
    totalUnitsInStock,
    inventoryCostValue,
    potentialRetailValue,
    potentialGrossProfit,
    lowStockItems,
    outOfStockItems,
    todaySales: todaySummary,
    weeklySales: weeklySummary,
    monthlySales: monthlySummary,
    allTimeSales: {
      revenue: allTimeRevenue,
      grossProfit: allTimeGrossProfit,
      cogs: allTimeCOGS,
      invoicesCount: completedInvoices.length,
    },
    operatingExpenses: {
      total: totalExpenses,
      byCategory: expensesByCategory,
    },
    netProfit,
    bestSellingProducts,
  };
}

export async function askBusinessAssistant(prompt: string, context: BusinessAIContext): Promise<string> {
  const response = await fetch('/api/assistant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      businessContext: context,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }

  const data = await response.json();
  return data.reply;
}
