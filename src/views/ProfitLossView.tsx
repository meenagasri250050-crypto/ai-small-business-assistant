import React, { useState } from 'react';
import { Invoice, Expense, Product, UserProfile } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  HelpCircle, 
  Calendar, 
  Layers, 
  Award, 
  ArrowRight,
  Info,
  CheckCircle2
} from 'lucide-react';

interface ProfitLossViewProps {
  invoices: Invoice[];
  expenses: Expense[];
  products: Product[];
  profile: UserProfile | null;
}

export const ProfitLossView: React.FC<ProfitLossViewProps> = ({
  invoices,
  expenses,
  products,
  profile,
}) => {
  const currency = profile?.currency || '₹';

  // Period mode
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');

  // Custom date bounds
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const [customStart, setCustomStart] = useState(thirtyDaysAgoStr);
  const [customEnd, setCustomEnd] = useState(todayStr);

  // Compute active date boundaries
  let startDate = todayStr;
  let endDate = todayStr;
  let periodTitle = "Daily Report (Today)";

  if (period === 'daily') {
    startDate = todayStr;
    endDate = todayStr;
    periodTitle = `Daily Report (${todayStr})`;
  } else if (period === 'weekly') {
    startDate = sevenDaysAgoStr;
    endDate = todayStr;
    periodTitle = `Weekly Report (${sevenDaysAgoStr} to ${todayStr})`;
  } else if (period === 'monthly') {
    startDate = thirtyDaysAgoStr;
    endDate = todayStr;
    periodTitle = `Monthly Report (${thirtyDaysAgoStr} to ${todayStr})`;
  } else {
    startDate = customStart;
    endDate = customEnd;
    periodTitle = `Custom Report (${customStart} to ${customEnd})`;
  }

  // Filter ONLY completed invoices within range
  const periodInvoices = invoices.filter(inv => 
    inv.status === 'completed' && inv.date >= startDate && inv.date <= endDate
  );

  // Filter expenses within range
  const periodExpenses = expenses.filter(exp => 
    exp.date >= startDate && exp.date <= endDate
  );

  // Core Math Calculations
  const totalInvoices = periodInvoices.length;
  const totalUnitsSold = periodInvoices.reduce((sum, inv) => sum + inv.totalUnits, 0);
  const salesRevenue = periodInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const costOfGoodsSold = periodInvoices.reduce((sum, inv) => sum + inv.totalCOGS, 0);
  const grossProfit = salesRevenue - costOfGoodsSold;
  const operatingExpenses = periodExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = grossProfit - operatingExpenses;

  const grossMarginPct = salesRevenue > 0 ? (grossProfit / salesRevenue) * 100 : 0;
  const netMarginPct = salesRevenue > 0 ? (netProfit / salesRevenue) * 100 : 0;
  const isNetLoss = netProfit < 0;

  // Product-level Profit contribution during this period
  const productProfitMap = new Map<string, { name: string; sku: string; unitsSold: number; revenue: number; cogs: number; profit: number }>();

  for (const inv of periodInvoices) {
    for (const item of inv.items) {
      const existing = productProfitMap.get(item.productId) || {
        name: item.productName,
        sku: item.sku,
        unitsSold: 0,
        revenue: 0,
        cogs: 0,
        profit: 0,
      };
      const itemCOGS = item.quantity * item.unitPurchaseCost;
      existing.unitsSold += item.quantity;
      existing.revenue += item.lineTotal;
      existing.cogs += itemCOGS;
      existing.profit += (item.lineTotal - itemCOGS);
      productProfitMap.set(item.productId, existing);
    }
  }

  const topContributors = Array.from(productProfitMap.values())
    .sort((a, b) => b.profit - a.profit);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Period Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Profit and Loss (P&L) Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Audited financial breakdown using historical transaction cost snapshots.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs">
          <button
            type="button"
            onClick={() => setPeriod('daily')}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${period === 'daily' ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setPeriod('weekly')}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${period === 'weekly' ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setPeriod('monthly')}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${period === 'monthly' ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setPeriod('custom')}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${period === 'custom' ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Custom Range
          </button>
        </div>
      </div>

      {/* Custom Date Pickers */}
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 text-xs">
          <Calendar className="h-4 w-4 text-indigo-600" />
          <span className="font-semibold text-indigo-900">Select Range:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            />
          </div>
        </div>
      )}

      {/* Main Financial Statement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">1. Total Sales Revenue</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {currency}{salesRevenue.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {totalInvoices} bills ({totalUnitsSold} units sold)
          </span>
        </div>

        {/* Cost of Goods Sold */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">2. Cost of Goods Sold (COGS)</span>
          <div className="mt-2 text-2xl font-bold text-slate-700">
            {currency}{costOfGoodsSold.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Sum of sold units × purchase cost snapshots
          </span>
        </div>

        {/* Gross Profit */}
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-xs">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-indigo-900">3. Gross Profit</span>
            <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
              {grossMarginPct.toFixed(1)}% Margin
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-950">
            {currency}{grossProfit.toFixed(2)}
          </div>
          <span className="text-[11px] text-indigo-600 mt-1 block font-medium">
            Revenue minus product costs
          </span>
        </div>

        {/* Net Profit (or Net Loss) */}
        <div className={`rounded-2xl border p-5 shadow-xs ${
          isNetLoss 
            ? 'border-rose-200 bg-rose-50/70 text-rose-950' 
            : 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold">
              {isNetLoss ? '4. Realized Net Loss' : '4. Realized Net Profit'}
            </span>
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
              isNetLoss ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'
            }`}>
              {netMarginPct.toFixed(1)}% Net Margin
            </span>
          </div>
          <div className={`mt-2 text-2xl font-extrabold ${isNetLoss ? 'text-rose-700' : 'text-emerald-700'}`}>
            {currency}{netProfit.toFixed(2)}
          </div>
          <span className="text-[11px] opacity-80 mt-1 block">
            After {currency}{operatingExpenses.toFixed(2)} in operating expenses
          </span>
        </div>
      </div>

      {/* Plain-English Educational Guide for Shop Owners */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3 text-slate-800">
          <Info className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-bold">
            How Your Financial Statement is Calculated
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
            <span className="font-bold text-slate-900 block mb-1">Sales Revenue</span>
            <p className="leading-relaxed">
              The total money paid by customers for items purchased at your counter, minus any customer discounts applied.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
            <span className="font-bold text-slate-900 block mb-1">Gross Profit</span>
            <p className="leading-relaxed">
              <strong>Revenue − Cost of Goods Sold</strong>. This is the markup you made on the physical merchandise alone, before paying your shop expenses.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
            <span className="font-bold text-slate-900 block mb-1">Net Profit (Bottom Line)</span>
            <p className="leading-relaxed">
              <strong>Gross Profit − Operating Overhead</strong> (Rent, Electricity, Transport, Salaries). This is the true cash your business took home!
            </p>
          </div>
        </div>
      </div>

      {/* Product Profit Contribution Leaderboard */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Product Gross Profit Contribution
            </h3>
            <p className="text-xs text-slate-500">
              Itemized profit breakdown for {periodTitle}
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {topContributors.length} product(s) sold
          </span>
        </div>

        {topContributors.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No completed sales recorded during this selected date period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Rank & Product</th>
                  <th className="py-3 px-4 font-semibold text-center">Units Sold</th>
                  <th className="py-3 px-4 font-semibold text-right">Revenue</th>
                  <th className="py-3 px-4 font-semibold text-right">Cost (COGS)</th>
                  <th className="py-3 px-4 font-semibold text-right">Gross Profit</th>
                  <th className="py-3 px-4 font-semibold text-right">Profit Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topContributors.map((item, idx) => {
                  const marginPct = item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-900">{item.name}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">SKU: {item.sku}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {item.unitsSold}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-900">
                        {currency}{item.revenue.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {currency}{item.cogs.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        {currency}{item.profit.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {marginPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
