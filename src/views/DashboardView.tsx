import React, { useState } from 'react';
import { Product, Invoice, Expense, UserProfile } from '../types';
import { 
  Package, 
  Boxes, 
  IndianRupee, 
  TrendingUp, 
  AlertTriangle, 
  Receipt, 
  ArrowUpRight, 
  Sparkles, 
  ShoppingCart, 
  PlusCircle, 
  WalletCards,
  Clock,
  Eye
} from 'lucide-react';

interface DashboardViewProps {
  products: Product[];
  invoices: Invoice[];
  expenses: Expense[];
  profile: UserProfile | null;
  onNavigate: (view: string) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onOpenRestock: (product: Product) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  invoices,
  expenses,
  profile,
  onNavigate,
  onViewInvoice,
  onOpenRestock,
}) => {
  const currency = profile?.currency || '₹';
  const [salesPeriod, setSalesPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Inventory Totals
  const totalProducts = products.length;
  let totalUnitsInStock = 0;
  let inventoryValue = 0; // Cost Value
  let potentialRetailValue = 0;
  const lowStockProducts: Product[] = [];

  for (const p of products) {
    totalUnitsInStock += p.currentStock;
    inventoryValue += p.currentStock * p.purchaseCost;
    potentialRetailValue += p.currentStock * p.sellingPrice;
    if (p.currentStock <= p.lowStockThreshold) {
      lowStockProducts.push(p);
    }
  }

  const potentialGrossProfit = potentialRetailValue - inventoryValue;

  // Filter completed invoices only
  const completedInvoices = invoices.filter(inv => inv.status === 'completed');

  // Date filters
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  const monthAgo = new Date();
  monthAgo.setDate(now.getDate() - 30);
  const monthAgoStr = monthAgo.toISOString().split('T')[0];

  // Today calculations
  const todayInvoices = completedInvoices.filter(inv => inv.date === todayStr);
  const todayRevenue = todayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const todayGrossProfit = todayInvoices.reduce((sum, inv) => sum + inv.grossProfit, 0);
  const todayExpenses = expenses.filter(exp => exp.date === todayStr).reduce((sum, exp) => sum + exp.amount, 0);
  const todayNetProfit = todayGrossProfit - todayExpenses;

  // Period-based calculations
  let periodInvoices: Invoice[] = [];
  let periodExpensesList: Expense[] = [];
  let periodLabel = "Today";

  if (salesPeriod === 'daily') {
    periodInvoices = todayInvoices;
    periodExpensesList = expenses.filter(exp => exp.date === todayStr);
    periodLabel = "Today";
  } else if (salesPeriod === 'weekly') {
    periodInvoices = completedInvoices.filter(inv => inv.date >= weekAgoStr);
    periodExpensesList = expenses.filter(exp => exp.date >= weekAgoStr);
    periodLabel = "Past 7 Days";
  } else {
    periodInvoices = completedInvoices.filter(inv => inv.date >= monthAgoStr);
    periodExpensesList = expenses.filter(exp => exp.date >= monthAgoStr);
    periodLabel = "Past 30 Days";
  }

  const periodRevenue = periodInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const periodCOGS = periodInvoices.reduce((sum, inv) => sum + inv.totalCOGS, 0);
  const periodGrossProfit = periodInvoices.reduce((sum, inv) => sum + inv.grossProfit, 0);
  const periodExpenses = periodExpensesList.reduce((sum, exp) => sum + exp.amount, 0);
  const periodNetProfit = periodGrossProfit - periodExpenses;
  const periodUnitsSold = periodInvoices.reduce((sum, inv) => sum + inv.totalUnits, 0);

  // Best selling products calculation
  const productSalesMap = new Map<string, { product: Product | null; name: string; sku: string; unitsSold: number; revenue: number }>();
  for (const inv of completedInvoices) {
    for (const item of inv.items) {
      const existing = productSalesMap.get(item.productId) || {
        product: products.find(p => p.id === item.productId) || null,
        name: item.productName,
        sku: item.sku,
        unitsSold: 0,
        revenue: 0,
      };
      existing.unitsSold += item.quantity;
      existing.revenue += item.lineTotal;
      productSalesMap.set(item.productId, existing);
    }
  }

  const bestSellers = Array.from(productSalesMap.values())
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 5);

  const recentInvoices = invoices.slice(0, 6);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Store Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Live overview of products, stock valuation, sales performance, and net profit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('pos')}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>New Customer Bill</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('add-product')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <PlusCircle className="h-4 w-4 text-slate-500" />
            <span>Add Product</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('expenses')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <WalletCards className="h-4 w-4 text-slate-500" />
            <span>Expense</span>
          </button>
        </div>
      </div>

      {/* Row 1: Today's Realized Performance & Today's Net Profit */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Today's Sales Revenue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Today's Sales Revenue</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {currency}{todayRevenue.toFixed(2)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>{todayInvoices.length} bill(s) completed</span>
            <span className="font-medium text-emerald-600">Realized</span>
          </div>
        </div>

        {/* Today's Gross Profit */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Today's Gross Profit</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {currency}{todayGrossProfit.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Revenue minus snapshot product cost (COGS)
          </div>
        </div>

        {/* Today's Net Profit */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Today's Net Profit</span>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${todayNetProfit >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className={`mt-3 text-2xl font-bold ${todayNetProfit >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            {currency}{todayNetProfit.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {todayExpenses > 0 ? `After ${currency}${todayExpenses.toFixed(2)} expenses` : 'No operating expenses logged today'}
          </div>
        </div>

        {/* Low Stock Alerts Count */}
        <div 
          onClick={() => onNavigate('inventory')}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Low Stock Alerts</span>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${lowStockProducts.length > 0 ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {lowStockProducts.length}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>{lowStockProducts.length > 0 ? 'Action required' : 'Inventory healthy'}</span>
            <span className="text-indigo-600 font-medium">View items &rarr;</span>
          </div>
        </div>
      </div>

      {/* Row 2: Inventory Valuation & Potential Retail (Clearly Labeled) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Products */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Products</span>
            <Package className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="mt-3 text-xl font-bold text-slate-900">
            {totalProducts} <span className="text-xs font-normal text-slate-500">SKUs</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Distinct catalog items
          </div>
        </div>

        {/* Total Units in Stock */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Units in Stock</span>
            <Boxes className="h-5 w-5 text-blue-500" />
          </div>
          <div className="mt-3 text-xl font-bold text-slate-900">
            {totalUnitsInStock} <span className="text-xs font-normal text-slate-500">units</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Physical items on shelf
          </div>
        </div>

        {/* Inventory Value (At Purchase Cost) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Inventory Cost Value</span>
            <span className="text-[10px] rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 font-mono">Cost Basis</span>
          </div>
          <div className="mt-3 text-xl font-bold text-slate-900">
            {currency}{inventoryValue.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Stock Qty × Purchase Cost
          </div>
        </div>

        {/* Potential Retail Value & Unrealized Profit */}
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-indigo-900">
            <span className="text-xs font-semibold">Potential Retail Value</span>
            <span className="text-[10px] rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700 font-semibold">Unrealized</span>
          </div>
          <div className="mt-3 text-xl font-bold text-indigo-950">
            {currency}{potentialRetailValue.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-indigo-600 font-medium">
            Potential Profit: {currency}{potentialGrossProfit.toFixed(2)} (upon sale)
          </div>
        </div>
      </div>

      {/* Row 3: Sales Summary (Daily, Weekly, Monthly Switcher) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Sales & Profit Summary
            </h2>
            <p className="text-xs text-slate-500">
              Aggregated from verified customer invoices for {periodLabel}
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setSalesPeriod('daily')}
              className={`rounded-lg px-3 py-1.5 transition ${salesPeriod === 'daily' ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
            >
              Daily (Today)
            </button>
            <button
              type="button"
              onClick={() => setSalesPeriod('weekly')}
              className={`rounded-lg px-3 py-1.5 transition ${salesPeriod === 'weekly' ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
            >
              Weekly (7 Days)
            </button>
            <button
              type="button"
              onClick={() => setSalesPeriod('monthly')}
              className={`rounded-lg px-3 py-1.5 transition ${salesPeriod === 'monthly' ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
            >
              Monthly (30 Days)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-3 lg:grid-cols-6 text-center">
          <div className="rounded-xl bg-slate-50 p-3">
            <span className="text-[11px] font-medium text-slate-500 block">Total Bills</span>
            <span className="text-lg font-bold text-slate-900">{periodInvoices.length}</span>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <span className="text-[11px] font-medium text-slate-500 block">Units Sold</span>
            <span className="text-lg font-bold text-slate-900">{periodUnitsSold}</span>
          </div>

          <div className="rounded-xl bg-emerald-50/70 p-3">
            <span className="text-[11px] font-medium text-emerald-800 block">Sales Revenue</span>
            <span className="text-lg font-bold text-emerald-900">{currency}{periodRevenue.toFixed(2)}</span>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <span className="text-[11px] font-medium text-slate-500 block">Product Cost (COGS)</span>
            <span className="text-lg font-bold text-slate-700">{currency}{periodCOGS.toFixed(2)}</span>
          </div>

          <div className="rounded-xl bg-indigo-50/70 p-3">
            <span className="text-[11px] font-medium text-indigo-800 block">Gross Profit</span>
            <span className="text-lg font-bold text-indigo-900">{currency}{periodGrossProfit.toFixed(2)}</span>
          </div>

          <div className={`rounded-xl p-3 ${periodNetProfit >= 0 ? 'bg-blue-50/70 text-blue-900' : 'bg-rose-50/70 text-rose-900'}`}>
            <span className="text-[11px] font-medium block">Net Profit</span>
            <span className="text-lg font-bold">{currency}{periodNetProfit.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Row 4: Two Columns (Low Stock Alerts + Best-Selling Products) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low Stock Alerts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">
                Low Stock Alerts ({lowStockProducts.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Manage Inventory &rarr;
            </button>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              All inventory stock quantities are currently above threshold levels.
            </div>
          ) : (
            <div className="space-y-2.5">
              {lowStockProducts.slice(0, 5).map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between rounded-xl border border-amber-200/70 bg-amber-50/40 p-3 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{prod.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">SKU: {prod.sku} • Category: {prod.category}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className={`font-bold ${prod.currentStock === 0 ? 'text-rose-600' : 'text-amber-700'}`}>
                        {prod.currentStock} in stock
                      </span>
                      <span className="block text-[10px] text-slate-400">Min: {prod.lowStockThreshold}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenRestock(prod)}
                      className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 transition"
                    >
                      Restock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Best-Selling Products */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Best-Selling Products
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Full P&L Report &rarr;
            </button>
          </div>

          {bestSellers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No sales records yet. Completed customer bills will appear here automatically.
            </div>
          ) : (
            <div className="space-y-2.5">
              {bestSellers.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">SKU: {item.sku}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{item.unitsSold} units</span>
                    <span className="block text-[11px] text-emerald-600 font-medium">
                      {currency}{item.revenue.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 5: Recent Invoices Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Recent Invoices & Customer Bills
            </h3>
            <p className="text-xs text-slate-500">
              Click any invoice to view receipt details or reprint
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('sales')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            All Sales Records &rarr;
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="py-10 text-center">
            <Receipt className="mx-auto h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-700">No invoices generated yet</p>
            <p className="text-xs text-slate-400 mt-1">Start by adding your products and creating your first customer bill.</p>
            <button
              type="button"
              onClick={() => onNavigate('pos')}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <ShoppingCart className="h-4 w-4" />
              Open POS Billing
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase">
                  <th className="py-3 px-3 font-semibold">Invoice #</th>
                  <th className="py-3 px-3 font-semibold">Date & Time</th>
                  <th className="py-3 px-3 font-semibold">Customer</th>
                  <th className="py-3 px-3 font-semibold text-center">Items</th>
                  <th className="py-3 px-3 font-semibold text-right">Bill Total</th>
                  <th className="py-3 px-3 font-semibold text-center">Status</th>
                  <th className="py-3 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(inv.createdAt).toLocaleDateString()} {new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {inv.customerName || 'Walk-in'}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600">
                      {inv.items.length} ({inv.totalUnits} units)
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {currency}{inv.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                        inv.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onViewInvoice(inv)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View</span>
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
