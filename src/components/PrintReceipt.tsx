import React from 'react';
import { Invoice, UserProfile } from '../types';
import { Printer, X, CheckCircle2, ShoppingBag } from 'lucide-react';

interface PrintReceiptProps {
  invoice: Invoice;
  profile: UserProfile | null;
  onClose: () => void;
  onStartNewBill?: () => void;
}

export const PrintReceipt: React.FC<PrintReceiptProps> = ({
  invoice,
  profile,
  onClose,
  onStartNewBill,
}) => {
  const currency = profile?.currency || '₹';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden my-8">
        {/* Top Control Bar (Hidden on print) */}
        <div className="print:hidden flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold text-slate-800">Bill Saved Successfully</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Receipt Container (Formatted for printer & screen) */}
        <div id="printable-receipt" className="p-6 sm:p-8 text-slate-800 font-sans">
          {/* Header */}
          <div className="text-center pb-5 border-b border-dashed border-slate-300">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
              {profile?.shopName || 'Retail Shop'}
            </h2>
            {profile?.address && (
              <p className="text-xs text-slate-600 mt-1">{profile.address}</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-x-4 text-xs text-slate-600 mt-1">
              {profile?.phone && <span>Phone: {profile.phone}</span>}
              {profile?.gstNumber && <span>GST/Tax: {profile.gstNumber}</span>}
            </div>
            <div className="inline-block mt-3 rounded-md bg-slate-100 px-3 py-1 text-xs font-mono font-semibold text-slate-700 border border-slate-200">
              TAX INVOICE / RETAIL RECEIPT
            </div>
          </div>

          {/* Meta Details */}
          <div className="grid grid-cols-2 gap-2 py-4 text-xs border-b border-dashed border-slate-300">
            <div>
              <span className="text-slate-600 block">Invoice No:</span>
              <span className="font-mono font-semibold text-slate-800">{invoice.invoiceNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-600 block">Date & Time:</span>
              <span className="font-medium text-slate-800">
                {new Date(invoice.createdAt).toLocaleDateString()} {new Date(invoice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div>
              <span className="text-slate-600 block">Customer:</span>
              <span className="font-medium text-slate-800">{invoice.customerName || 'Walk-in Customer'}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-600 block">Payment Method:</span>
              <span className="font-semibold text-slate-800">{invoice.paymentMethod}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-4 border-b border-dashed border-slate-300">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 uppercase">
                  <th className="py-2 text-left font-semibold">Item</th>
                  <th className="py-2 text-center font-semibold">Qty</th>
                  <th className="py-2 text-right font-semibold">Rate</th>
                  <th className="py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="text-slate-800">
                    <td className="py-2.5 pr-2">
                      <div className="font-medium text-slate-900">{item.productName}</div>
                      <div className="text-[10px] font-mono text-slate-600">SKU: {item.sku}</div>
                    </td>
                    <td className="py-2.5 px-2 text-center font-semibold">{item.quantity}</td>
                    <td className="py-2.5 px-2 text-right">
                      {currency}{item.unitSellingPrice.toFixed(2)}
                    </td>
                    <td className="py-2.5 pl-2 text-right font-semibold">
                      {currency}{item.lineTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="py-4 space-y-1.5 text-xs border-b border-dashed border-slate-300">
            <div className="flex justify-between text-slate-600">
              <span>Total Units Sold:</span>
              <span className="font-semibold text-slate-800">{invoice.totalUnits}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-800">{currency}{invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount Applied:</span>
                <span>-{currency}{invoice.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 text-base font-bold text-slate-900 border-t border-slate-300">
              <span>Final Total Payable:</span>
              <span className="text-indigo-600">{currency}{invoice.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-5 text-center text-xs text-slate-600 space-y-1">
            <p className="italic">
              {profile?.receiptNote || 'Thank you for your purchase! Please visit again.'}
            </p>
            <p className="text-[10px] text-slate-600">
              Generated by AI Small Business Assistant • {invoice.invoiceNumber}
            </p>
          </div>
        </div>

        {/* Bottom Actions (Hidden on print) */}
        <div className="print:hidden border-t border-slate-200 bg-slate-50 p-4 sm:flex sm:items-center sm:justify-between gap-3">
          <div className="mb-2 sm:mb-0 text-xs text-slate-600">
            Status: <span className="font-semibold text-emerald-600 capitalize">{invoice.status}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-900 transition"
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </button>

            {onStartNewBill && (
              <button
                type="button"
                onClick={onStartNewBill}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                <ShoppingBag className="h-4 w-4" />
                Start New Bill
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
