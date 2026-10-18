import React, { useState } from 'react';
import { Expense, UserProfile } from '../types';
import { 
  WalletCards, 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  Tag, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle,
  X 
} from 'lucide-react';
import { addExpense, deleteExpense } from '../services/firestoreService';
import { ConfirmModal } from '../components/ConfirmModal';

interface ExpensesViewProps {
  expenses: Expense[];
  profile: UserProfile | null;
  userId: string;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  profile,
  userId,
}) => {
  const currency = profile?.currency || '₹';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('month');

  // Add Expense Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Expense['category']>('Rent');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  // Delete Expense Modal
  const [deleteCandidate, setDeleteCandidate] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const categories: Expense['category'][] = [
    'Rent',
    'Electricity',
    'Transport',
    'Packaging',
    'Salaries',
    'Marketing',
    'Maintenance',
    'Other',
  ];

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  const monthAgo = new Date();
  monthAgo.setDate(now.getDate() - 30);
  const monthAgoStr = monthAgo.toISOString().split('T')[0];

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = 
      exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.description && exp.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || exp.category === selectedCategory;

    let matchesDate = true;
    if (dateFilter === 'today') matchesDate = exp.date === todayStr;
    else if (dateFilter === 'week') matchesDate = exp.date >= weekAgoStr;
    else if (dateFilter === 'month') matchesDate = exp.date >= monthAgoStr;

    return matchesSearch && matchesCategory && matchesDate;
  });

  const totalFilteredExpense = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Group by category for visual analytics
  const categoryTotals: Record<string, number> = {};
  for (const exp of filteredExpenses) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setIsSubmitting(true);

    try {
      const parsedAmount = parseFloat(amount);
      if (!title.trim()) throw new Error('Please enter an expense title.');
      if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error('Please enter a valid expense amount (> 0).');

      await addExpense(userId, {
        title: title.trim(),
        category,
        amount: parsedAmount,
        date: date || todayStr,
        description: description.trim(),
      });

      setActionSuccess(`Recorded expense "${title}" of ${currency}${parsedAmount.toFixed(2)}.`);
      setIsAddOpen(false);
      setTitle('');
      setAmount('');
      setDescription('');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    setIsDeleting(true);
    setActionError(null);

    try {
      await deleteExpense(userId, deleteCandidate.id);
      setActionSuccess(`Deleted expense "${deleteCandidate.title}".`);
      setDeleteCandidate(null);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete expense.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Operating Business Expenses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track overhead costs like rent, utilities, delivery, packaging, and employee wages.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setActionError(null);
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Record New Expense</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button type="button" onClick={() => setActionSuccess(null)}>
            <X className="h-4 w-4 text-emerald-600" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button type="button" onClick={() => setActionError(null)}>
            <X className="h-4 w-4 text-rose-600" />
          </button>
        </div>
      )}

      {/* KPI & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Total Metric Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Total Operating Overhead</span>
              <TrendingDown className="h-5 w-5 text-rose-500" />
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900">
              {currency}{totalFilteredExpense.toFixed(2)}
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              Deducted from Gross Profit to determine final Net Profit
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{filteredExpenses.length} entries recorded</span>
            <span className="font-medium text-slate-700 capitalize">{dateFilter} period</span>
          </div>
        </div>

        {/* Category Breakdown Chips */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Overhead by Category
          </h3>
          {Object.keys(categoryTotals).length === 0 ? (
            <p className="text-xs text-slate-400 py-4">No expenses recorded in this period.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Object.entries(categoryTotals).map(([cat, amt]) => {
                const pct = totalFilteredExpense > 0 ? (amt / totalFilteredExpense) * 100 : 0;
                return (
                  <div key={cat} className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs">
                    <span className="text-slate-500 block truncate">{cat}</span>
                    <span className="font-bold text-slate-900 block mt-0.5 font-mono">
                      {currency}{amt.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{pct.toFixed(0)}% of expenses</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expenses by title or note..."
            className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => setDateFilter('all')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${dateFilter === 'all' ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('today')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${dateFilter === 'today' ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('week')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${dateFilter === 'week' ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('month')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${dateFilter === 'month' ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              30 Days
            </button>
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs text-slate-700 focus:border-indigo-600 focus:outline-none"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {filteredExpenses.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <WalletCards className="mx-auto h-10 w-10 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No expenses recorded</p>
            <p className="mt-1 text-slate-400">Add bills like rent or electricity to maintain accurate Net Profit calculations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Expense Title</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Notes</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {exp.date}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {exp.title}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {exp.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {exp.description || '—'}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-rose-600 font-mono">
                      {currency}{exp.amount.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(exp)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Delete Expense"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Expense Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h3 className="text-base font-bold text-slate-900">
                Record Business Operating Expense
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Shop Monthly Rent"
                  className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Receipt Details (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Paid via UPI to Landlord, Bill #204..."
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteCandidate}
        title="Delete Expense Entry"
        message={`Are you sure you want to remove the expense "${deleteCandidate?.title}" for ${currency}${deleteCandidate?.amount.toFixed(2)}?`}
        confirmLabel="Yes, Delete Expense"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteCandidate(null)}
      />
    </div>
  );
};
