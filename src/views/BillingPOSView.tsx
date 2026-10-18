import React, { useState } from 'react';
import { Product, CartItem, Invoice, UserProfile } from '../types';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Printer, 
  User, 
  Phone, 
  CreditCard, 
  Percent, 
  RotateCcw,
  Package,
  Layers,
  ShoppingBag
} from 'lucide-react';
import { completeRetailSale } from '../services/firestoreService';
import { PrintReceipt } from '../components/PrintReceipt';

interface BillingPOSViewProps {
  products: Product[];
  profile: UserProfile | null;
  userId: string;
}

export const BillingPOSView: React.FC<BillingPOSViewProps> = ({
  products,
  profile,
  userId,
}) => {
  const currency = profile?.currency || '₹';

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Other'>('Cash');
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [notes, setNotes] = useState('');

  // Catalog search and filter for quick-adding
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Transaction processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedInvoice, setCompletedInvoice] = useState<Invoice | null>(null);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // Available products for POS (filter out deleted or inactive)
  const filteredCatalog = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart Operations
  const addToCart = (product: Product) => {
    setErrorMessage(null);

    // Check if product already in cart
    const existingIndex = cart.findIndex(item => item.product.id === product.id);

    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + 1 > product.currentStock) {
        setErrorMessage(`Cannot add more "${product.name}". Only ${product.currentStock} units available in stock.`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      if (product.currentStock < 1) {
        setErrorMessage(`"${product.name}" is out of stock!`);
        return;
      }
      setCart([...cart, {
        product,
        quantity: 1,
        unitSellingPrice: product.sellingPrice,
      }]);
    }
  };

  const updateQuantity = (productId: string, newQty: number) => {
    setErrorMessage(null);
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > item.product.currentStock) {
      setErrorMessage(`Maximum stock available for "${item.product.name}" is ${item.product.currentStock}.`);
      return;
    }

    setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: newQty } : i));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setDiscountAmount('0');
    setNotes('');
    setErrorMessage(null);
  };

  // Calculations
  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unitSellingPrice), 0);
  const parsedDiscount = Math.min(Math.max(0, parseFloat(discountAmount) || 0), subtotal);
  const finalTotal = Math.max(0, subtotal - parsedDiscount);

  // Complete Sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setErrorMessage('Please add at least one product to the bill.');
      return;
    }

    // Verify stock before submitting
    for (const item of cart) {
      if (item.quantity > item.product.currentStock) {
        setErrorMessage(`Insufficient stock for "${item.product.name}". Only ${item.product.currentStock} units left.`);
        return;
      }
    }

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const invoice = await completeRetailSale(userId, cart, {
        name: customerName,
        phone: customerPhone,
        paymentMethod,
        discount: parsedDiscount,
        notes,
      });

      setCompletedInvoice(invoice);
      clearCart();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete sale transaction.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Retail POS & Customer Billing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Fast multi-product counter billing with instant stock validation and customer receipts.
          </p>
        </div>

        {cart.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-rose-600 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Cart</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main 2-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 Cols): Product Catalog & Quick Add */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search products by name or SKU..."
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs text-slate-700 focus:border-indigo-600 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Product Grid */}
            {filteredCatalog.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <span>No matching products found in inventory.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[580px] overflow-y-auto pr-1">
                {filteredCatalog.map((prod) => {
                  const isOut = prod.currentStock <= 0;
                  const cartEntry = cart.find(i => i.product.id === prod.id);
                  const inCartQty = cartEntry ? cartEntry.quantity : 0;

                  return (
                    <button
                      key={prod.id}
                      type="button"
                      disabled={isOut}
                      onClick={() => addToCart(prod)}
                      className={`group relative flex flex-col justify-between text-left rounded-xl border p-3 transition ${
                        isOut
                          ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                          : inCartQty > 0
                          ? 'border-indigo-300 bg-indigo-50/40 hover:bg-indigo-50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/80 shadow-2xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-semibold text-slate-900 text-xs line-clamp-2 leading-tight">
                            {prod.name}
                          </span>
                          {inCartQty > 0 && (
                            <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                              {inCartQty}
                            </span>
                          )}
                        </div>
                        <span className="mt-1 block font-mono text-[10px] text-slate-400">
                          {prod.sku}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                        <span className="font-bold text-slate-900">
                          {currency}{prod.sellingPrice.toFixed(2)}
                        </span>
                        <span className={`text-[10px] font-medium ${isOut ? 'text-rose-600 font-bold' : prod.currentStock <= prod.lowStockThreshold ? 'text-amber-600' : 'text-slate-500'}`}>
                          {isOut ? 'Out of Stock' : `${prod.currentStock} left`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols): Live Multi-Item Cart & Checkout Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Current Customer Bill
                </h3>
              </div>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                {cart.length} item(s) • {totalUnits} unit(s)
              </span>
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <ShoppingBag className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                <p className="font-medium text-slate-600">The bill is currently empty</p>
                <p className="mt-1 text-slate-400">Click products from the left to add multiple items to this bill.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto my-3 pr-1">
                {cart.map((item) => (
                  <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{item.product.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {currency}{item.unitSellingPrice.toFixed(2)} each • Max: {item.product.currentStock}
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.product.currentStock}
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value, 10) || 1)}
                        className="w-10 rounded-md border border-slate-300 text-center py-0.5 text-xs font-semibold text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.currentStock}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Line Total & Remove */}
                    <div className="text-right w-16">
                      <div className="font-bold text-slate-900 font-mono">
                        {currency}{(item.quantity * item.unitSellingPrice).toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-[10px] text-rose-500 hover:text-rose-700 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Customer Information (Optional for Walk-ins) */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-700">Customer Details (Optional)</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name / Walk-in"
                    className="w-full rounded-xl border border-slate-300 py-1.5 pl-8 pr-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone (Optional)"
                    className="w-full rounded-xl border border-slate-300 py-1.5 pl-8 pr-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Cash', 'UPI', 'Card', 'Other'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-lg py-1.5 text-center text-xs font-semibold transition ${
                        paymentMethod === method
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Discount */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-600 font-medium">Apply Discount ({currency}):</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-24 rounded-lg border border-slate-300 py-1 px-2 text-right text-xs font-semibold text-slate-900"
                />
              </div>

              {/* Bill Totals Summary */}
              <div className="rounded-xl bg-slate-50 p-3.5 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal ({totalUnits} units):</span>
                  <span className="font-medium text-slate-800">{currency}{subtotal.toFixed(2)}</span>
                </div>
                {parsedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount:</span>
                    <span>-{currency}{parsedDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Amount Payable:</span>
                  <span className="text-emerald-700">{currency}{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Complete Sale Button */}
              <button
                type="button"
                disabled={cart.length === 0 || isProcessing}
                onClick={handleCompleteSale}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <span>Processing & Deducting Stock...</span>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    <span>Complete Sale ({currency}{finalTotal.toFixed(2)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal upon Completion */}
      {completedInvoice && (
        <PrintReceipt
          invoice={completedInvoice}
          profile={profile}
          onClose={() => setCompletedInvoice(null)}
          onStartNewBill={() => setCompletedInvoice(null)}
        />
      )}
    </div>
  );
};
