import React, { useState } from 'react';
import { Invoice, UserProfile } from '../types';
import { 
  Receipt, 
  Search, 
  Filter, 
  Eye, 
  Printer, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  X,
  CreditCard,
  User,
  ShoppingBag
} from 'lucide-react';
import { cancelOrRefundInvoice } from '../services/firestoreService';
import { ConfirmModal } from '../components/ConfirmModal';
import { PrintReceipt } from '../components/PrintReceipt';

interface SalesHistoryViewProps {
  invoices: Invoice[];
  profile: UserProfile | null;
  userId: string;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  invoices,
  profile,
  userId,
}) => {
  const currency = profile?.currency || '₹';

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'completed' | 'cancelled' | 'refunded'>('All');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Modals
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<Invoice | null>(null);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);
  const [cancelCandidate, setCancelCandidate] = useState<Invoice | null>(null);
  const [cancelType, setCancelType] = useState<'cancelled' | 'refunded'>('refunded');
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Dates
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  const monthAgo = new Date();
  monthAgo.setDate(now.getDate() - 30);
  const monthAgoStr = monthAgo.toISOString().split('T')[0];

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inv.customerPhone && inv.customerPhone.includes(searchQuery));

    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;

    let matchesDate = true;
    if (dateFilter === 'today') matchesDate = inv.date === todayStr;
    else if (dateFilter === 'week') matchesDate = inv.date >= weekAgoStr;
    else if (dateFilter === 'month') matchesDate = inv.date >= monthAgoStr;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleConfirmCancelRefund = async () => {
    if (!cancelCandidate) return;
    setIsCancelling(true);
    setActionError(null);

    try {
      await cancelOrRefundInvoice(userId, cancelCandidate, cancelType);
      setActionSuccess(`Invoice ${cancelCandidate.invoiceNumber} has been marked as ${cancelType}. Stock has been restored to inventory.`);
      setCancelCandidate(null);
      if (selectedInvoiceForView?.id === cancelCandidate.id) {
        setSelectedInvoiceForView(null);
      }
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setActionError(err.message || `Failed to process ${cancelType}.`);
    } finally {
      setIsCancelling(false);
    }
  };

  const totalFilteredRevenue = filteredInvoices
    .filter(i => i.status === 'completed')
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const totalFilteredUnits = filteredInvoices
    .filter(i => i.status === 'completed')
    .reduce((sum, i) => sum + i.totalUnits, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Sales Invoices & Billing History
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Auditable sales log, receipt re-printing, item breakdowns, and stock restoration workflows.
        </p>
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-[11px] font-medium text-slate-500">Filtered Completed Bills</span>
          <div className="mt-1 text-xl font-bold text-slate-900">
            {filteredInvoices.filter(i => i.status === 'completed').length} <span className="text-xs font-normal text-slate-400">invoices</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-[11px] font-medium text-slate-500">Total Units Sold</span>
          <div className="mt-1 text-xl font-bold text-slate-900">
            {totalFilteredUnits} <span className="text-xs font-normal text-slate-400">units</span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
          <span className="text-[11px] font-semibold text-emerald-800">Realized Sales Revenue</span>
          <div className="mt-1 text-xl font-bold text-emerald-950">
            {currency}{totalFilteredRevenue.toFixed(2)}
          </div>
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
            placeholder="Search by invoice #, customer name, or phone..."
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
              All Time
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

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs text-slate-700 focus:border-indigo-600 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="completed">Completed Only</option>
            <option value="refunded">Refunded Only</option>
            <option value="cancelled">Cancelled Only</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {filteredInvoices.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <Receipt className="mx-auto h-10 w-10 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No invoices match your filter</p>
            <p className="mt-1 text-slate-400">Completed customer sales will appear in this log.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Payment</th>
                  <th className="py-3 px-4 font-semibold text-center">Items & Units</th>
                  <th className="py-3 px-4 font-semibold text-right">Bill Total</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      <div>{new Date(inv.createdAt).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{inv.customerName || 'Walk-in'}</div>
                      {inv.customerPhone && (
                        <div className="text-[10px] text-slate-400">{inv.customerPhone}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        {inv.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center text-slate-700">
                      <span className="font-semibold">{inv.items.length} products</span>
                      <span className="block text-[10px] text-slate-400">({inv.totalUnits} units total)</span>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                      {currency}{inv.totalAmount.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                        inv.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {inv.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceForView(inv)}
                          title="View Full Itemized Invoice"
                          className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceForPrint(inv)}
                          title="Print Receipt"
                          className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Printer className="h-4 w-4" />
                        </button>

                        {inv.status === 'completed' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelCandidate(inv);
                              setCancelType('refunded');
                            }}
                            title="Refund & Restore Stock"
                            className="rounded-lg p-1 text-amber-600 hover:bg-amber-50 hover:text-amber-800"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoiceForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Invoice Details: {selectedInvoiceForView.invoiceNumber}
                </h3>
                <span className="text-xs text-slate-500">
                  Created {new Date(selectedInvoiceForView.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceForView(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Meta details */}
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3.5">
                <div>
                  <span className="text-slate-500 block">Customer:</span>
                  <span className="font-semibold text-slate-800">{selectedInvoiceForView.customerName || 'Walk-in'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Payment Method:</span>
                  <span className="font-semibold text-slate-800">{selectedInvoiceForView.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status:</span>
                  <span className={`font-bold capitalize ${selectedInvoiceForView.status === 'completed' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedInvoiceForView.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Units Sold:</span>
                  <span className="font-semibold text-slate-800">{selectedInvoiceForView.totalUnits} units</span>
                </div>
              </div>

              {/* Items List */}
              <div>
                <div className="font-bold text-slate-900 mb-2">Purchased Items</div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Item & SKU</th>
                        <th className="py-2 px-2 text-center">Qty</th>
                        <th className="py-2 px-2 text-right">Selling Rate</th>
                        <th className="py-2 px-2 text-right">Cost Snapshot</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoiceForView.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">
                            <div className="font-medium text-slate-900">{item.productName}</div>
                            <div className="font-mono text-[10px] text-slate-400">SKU: {item.sku}</div>
                          </td>
                          <td className="py-2 px-2 text-center font-semibold">{item.quantity}</td>
                          <td className="py-2 px-2 text-right">{currency}{item.unitSellingPrice.toFixed(2)}</td>
                          <td className="py-2 px-2 text-right text-slate-500">{currency}{item.unitPurchaseCost.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{currency}{item.lineTotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="rounded-xl border border-slate-200 p-3 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-medium text-slate-800">{currency}{selectedInvoiceForView.subtotal.toFixed(2)}</span>
                </div>
                {selectedInvoiceForView.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount:</span>
                    <span>-{currency}{selectedInvoiceForView.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200 text-sm">
                  <span>Total Bill Amount:</span>
                  <span className="text-indigo-600">{currency}{selectedInvoiceForView.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 pt-1 text-[11px]">
                  <span>Cost of Goods (COGS):</span>
                  <span>{currency}{selectedInvoiceForView.totalCOGS.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-700 text-xs">
                  <span>Gross Profit from this Sale:</span>
                  <span>{currency}{selectedInvoiceForView.grossProfit.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  {selectedInvoiceForView.status === 'completed' && (
                    <button
                      type="button"
                      onClick={() => {
                        setCancelCandidate(selectedInvoiceForView);
                        setCancelType('refunded');
                      }}
                      className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                    >
                      Process Refund (Restores Stock)
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInvoiceForPrint(selectedInvoiceForView);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedInvoiceForView(null)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Receipt Modal */}
      {selectedInvoiceForPrint && (
        <PrintReceipt
          invoice={selectedInvoiceForPrint}
          profile={profile}
          onClose={() => setSelectedInvoiceForPrint(null)}
        />
      )}

      {/* Refund/Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={!!cancelCandidate}
        title="Confirm Sale Refund & Stock Restoration"
        message={`Are you sure you want to mark invoice ${cancelCandidate?.invoiceNumber} as ${cancelType}? This will automatically restore all ${cancelCandidate?.totalUnits} units of product stock back to your inventory and adjust profit reports accordingly.`}
        confirmLabel={`Yes, Mark as ${cancelType}`}
        cancelLabel="Keep Sale Unchanged"
        isDestructive={false}
        isLoading={isCancelling}
        onConfirm={handleConfirmCancelRefund}
        onCancel={() => setCancelCandidate(null)}
      />
    </div>
  );
};
