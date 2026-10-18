import React, { useState } from 'react';
import { Product, UserProfile } from '../types';
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { addProduct, updateProduct, deleteProduct, restockProduct } from '../services/firestoreService';
import { ConfirmModal } from '../components/ConfirmModal';

interface InventoryViewProps {
  products: Product[];
  profile: UserProfile | null;
  userId: string;
  onOpenAddProduct?: () => void;
  preselectedProductForRestock?: Product | null;
  onClearPreselectedProduct?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  profile,
  userId,
  preselectedProductForRestock,
  onClearPreselectedProduct,
}) => {
  const currency = profile?.currency || '₹';

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'InStock' | 'LowStock' | 'OutOfStock'>('All');

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockTargetProduct, setRestockTargetProduct] = useState<Product | null>(preselectedProductForRestock || null);
  const [restockQty, setRestockQty] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [restockNotes, setRestockNotes] = useState('');

  const [deleteCandidate, setDeleteCandidate] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPurchaseCost, setFormPurchaseCost] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formCurrentStock, setFormCurrentStock] = useState('');
  const [formLowStockThreshold, setFormLowStockThreshold] = useState('5');
  const [formDescription, setFormDescription] = useState('');

  // Handle incoming preselected restock target from dashboard
  React.useEffect(() => {
    if (preselectedProductForRestock) {
      setRestockTargetProduct(preselectedProductForRestock);
      setRestockCost(preselectedProductForRestock.purchaseCost.toString());
      setIsRestockOpen(true);
      if (onClearPreselectedProduct) onClearPreselectedProduct();
    }
  }, [preselectedProductForRestock]);

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormCategory('General');
    setFormPurchaseCost('');
    setFormSellingPrice('');
    setFormCurrentStock('10');
    setFormLowStockThreshold('5');
    setFormDescription('');
    setActionError(null);
    setIsAddEditOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormCategory(p.category);
    setFormPurchaseCost(p.purchaseCost.toString());
    setFormSellingPrice(p.sellingPrice.toString());
    setFormCurrentStock(p.currentStock.toString());
    setFormLowStockThreshold(p.lowStockThreshold.toString());
    setFormDescription(p.description || '');
    setActionError(null);
    setIsAddEditOpen(true);
  };

  // Open Restock Modal
  const handleOpenRestockModal = (p: Product) => {
    setRestockTargetProduct(p);
    setRestockCost(p.purchaseCost.toString());
    setRestockQty('');
    setRestockNotes('');
    setActionError(null);
    setIsRestockOpen(true);
  };

  // Save Add/Edit
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setIsSubmitting(true);

    try {
      const pCost = parseFloat(formPurchaseCost);
      const sPrice = parseFloat(formSellingPrice);
      const cStock = parseInt(formCurrentStock, 10);
      const lThreshold = parseInt(formLowStockThreshold, 10);

      if (!formName.trim()) throw new Error('Product name is required.');
      if (!formSku.trim()) throw new Error('SKU / Product ID is required.');
      if (isNaN(pCost) || pCost < 0) throw new Error('Please enter a valid purchase cost (>= 0).');
      if (isNaN(sPrice) || sPrice < 0) throw new Error('Please enter a valid selling price (>= 0).');
      if (isNaN(cStock) || cStock < 0) throw new Error('Stock quantity cannot be negative.');
      if (isNaN(lThreshold) || lThreshold < 0) throw new Error('Low stock threshold cannot be negative.');

      if (editingProduct) {
        await updateProduct(userId, editingProduct.id, {
          name: formName.trim(),
          sku: formSku.trim(),
          category: formCategory.trim() || 'General',
          purchaseCost: pCost,
          sellingPrice: sPrice,
          currentStock: cStock,
          lowStockThreshold: lThreshold,
          description: formDescription.trim(),
        });
        setActionSuccess(`Updated product "${formName}" successfully.`);
      } else {
        await addProduct(userId, {
          name: formName.trim(),
          sku: formSku.trim(),
          category: formCategory.trim() || 'General',
          purchaseCost: pCost,
          sellingPrice: sPrice,
          currentStock: cStock,
          lowStockThreshold: lThreshold,
          description: formDescription.trim(),
        });
        setActionSuccess(`Product "${formName}" created and added to inventory.`);
      }

      setIsAddEditOpen(false);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Restock handler
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockTargetProduct) return;
    setActionError(null);
    setIsSubmitting(true);

    try {
      const qty = parseInt(restockQty, 10);
      const cost = parseFloat(restockCost);

      if (isNaN(qty) || qty <= 0) throw new Error('Restock quantity must be at least 1.');
      if (isNaN(cost) || cost < 0) throw new Error('Please enter a valid purchase cost.');

      await restockProduct(userId, restockTargetProduct.id, qty, cost, restockNotes);
      setActionSuccess(`Restocked ${qty} units of "${restockTargetProduct.name}".`);
      setIsRestockOpen(false);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to restock product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete product handler
  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    setIsDeleting(true);
    try {
      await deleteProduct(userId, deleteCandidate.id);
      setActionSuccess(`Deleted "${deleteCandidate.name}" from inventory.`);
      setDeleteCandidate(null);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete product.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtering products
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;

    let matchesStock = true;
    if (stockFilter === 'InStock') matchesStock = p.currentStock > p.lowStockThreshold;
    else if (stockFilter === 'LowStock') matchesStock = p.currentStock > 0 && p.currentStock <= p.lowStockThreshold;
    else if (stockFilter === 'OutOfStock') matchesStock = p.currentStock === 0;

    return matchesSearch && matchesCat && matchesStock;
  });

  // Calculate live filtered inventory metrics
  const totalFilteredUnits = filteredProducts.reduce((acc, p) => acc + p.currentStock, 0);
  const totalCostVal = filteredProducts.reduce((acc, p) => acc + (p.currentStock * p.purchaseCost), 0);
  const totalRetailVal = filteredProducts.reduce((acc, p) => acc + (p.currentStock * p.sellingPrice), 0);
  const totalPotentialProfit = totalRetailVal - totalCostVal;

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Add button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Product Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage your catalog, stock quantities, cost bases, and restock purchase logs.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Notifications */}
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
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button type="button" onClick={() => setActionError(null)}>
            <X className="h-4 w-4 text-rose-600" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-[11px] font-medium text-slate-500">Filtered Items</span>
          <div className="mt-1 text-lg font-bold text-slate-900">{filteredProducts.length}</div>
          <span className="text-[10px] text-slate-400">{totalFilteredUnits} units in stock</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-[11px] font-medium text-slate-500">Inventory Cost Value</span>
          <div className="mt-1 text-lg font-bold text-slate-900">{currency}{totalCostVal.toFixed(2)}</div>
          <span className="text-[10px] text-slate-400">Total purchase expense</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-[11px] font-medium text-slate-500">Potential Retail Value</span>
          <div className="mt-1 text-lg font-bold text-slate-900">{currency}{totalRetailVal.toFixed(2)}</div>
          <span className="text-[10px] text-slate-400">If all units sell at current price</span>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
          <span className="text-[11px] font-semibold text-indigo-700">Potential Gross Profit</span>
          <div className="mt-1 text-lg font-bold text-indigo-900">{currency}{totalPotentialProfit.toFixed(2)}</div>
          <span className="text-[10px] text-indigo-600 italic">Unrealized until sold</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, SKU, or category..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
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

          {/* Stock Status Filter Buttons */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => setStockFilter('All')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${stockFilter === 'All' ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('InStock')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${stockFilter === 'InStock' ? 'bg-white font-semibold text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              In Stock
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('LowStock')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${stockFilter === 'LowStock' ? 'bg-white font-semibold text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Low Stock
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('OutOfStock')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${stockFilter === 'OutOfStock' ? 'bg-white font-semibold text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Out of Stock
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-sm font-semibold text-slate-700">No products match your criteria</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {products.length === 0
                ? "Your product catalog is empty. Click 'Add New Product' to start building your inventory."
                : "Try adjusting your search query or stock filter to view your items."}
            </p>
            {products.length === 0 && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Add Your First Product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Product & SKU</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold text-right">Cost Price</th>
                  <th className="py-3 px-4 font-semibold text-right">Selling Price</th>
                  <th className="py-3 px-4 font-semibold text-right">Unit Margin</th>
                  <th className="py-3 px-4 font-semibold text-center">Stock Level</th>
                  <th className="py-3 px-4 font-semibold text-right">Inventory Value</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const unitMargin = p.sellingPrice - p.purchaseCost;
                  const marginPct = p.sellingPrice > 0 ? (unitMargin / p.sellingPrice) * 100 : 0;
                  const itemValue = p.currentStock * p.purchaseCost;
                  const isOutOfStock = p.currentStock === 0;
                  const isLowStock = !isOutOfStock && p.currentStock <= p.lowStockThreshold;

                  return (
                    <tr 
                      key={p.id} 
                      className={`hover:bg-slate-50/80 transition ${
                        isOutOfStock 
                          ? 'bg-rose-50/30' 
                          : isLowStock 
                          ? 'bg-amber-50/30' 
                          : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="font-mono text-[11px] text-slate-400">SKU: {p.sku}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {p.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-600 font-mono">
                        {currency}{p.purchaseCost.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900 font-mono">
                        {currency}{p.sellingPrice.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className={`font-semibold ${unitMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {currency}{unitMargin.toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          ({marginPct.toFixed(0)}%)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-800'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isOutOfStock ? (
                              'Out of Stock'
                            ) : isLowStock ? (
                              <>
                                <AlertTriangle className="h-3 w-3" />
                                {p.currentStock} (Low)
                              </>
                            ) : (
                              `${p.currentStock} in stock`
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">Threshold: {p.lowStockThreshold}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-800">
                        {currency}{itemValue.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenRestockModal(p)}
                            title="Restock units"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50 hover:border-amber-300 transition"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Restock</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Product"
                            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(p)}
                            title="Delete Product"
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl my-8 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct ? 'Edit Product Details' : 'Add New Inventory Product'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddEditOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Premium Basmati Rice 1kg"
                  className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SKU / Barcode ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="e.g. SKU-1049"
                    className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs font-mono text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Grocery, Snacks, etc."
                    className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Cost ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formPurchaseCost}
                    onChange={(e) => setFormPurchaseCost(e.target.value)}
                    placeholder="e.g. 60.00"
                    className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">What you pay supplier</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selling Price ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value)}
                    placeholder="e.g. 85.00"
                    className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Retail customer price</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {editingProduct ? 'Current Stock Quantity *' : 'Initial Stock Quantity *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formCurrentStock}
                    onChange={(e) => setFormCurrentStock(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Low Stock Alert Threshold *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formLowStockThreshold}
                    onChange={(e) => setFormLowStockThreshold(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional brand notes, package size, shelf location..."
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Restock Purchase Modal */}
      {isRestockOpen && restockTargetProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between border-b border-slate-200 bg-amber-50 px-6 py-4">
              <div className="flex items-center gap-2 text-amber-800">
                <RefreshCw className="h-5 w-5" />
                <h3 className="text-base font-bold">Record Inventory Restock</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRestockOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="p-6 space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <span className="text-slate-500 block">Product:</span>
                <span className="font-bold text-slate-900 text-sm">{restockTargetProduct.name}</span>
                <div className="flex justify-between mt-1 text-slate-500">
                  <span>Current Stock: <strong className="text-slate-800">{restockTargetProduct.currentStock} units</strong></span>
                  <span>SKU: {restockTargetProduct.sku}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity Received (Units) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs text-slate-900 focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Purchase Cost Per Unit ({currency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={restockCost}
                  onChange={(e) => setRestockCost(e.target.value)}
                  placeholder="e.g. 60.00"
                  className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs text-slate-900 focus:border-amber-600 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">
                  Updates product cost basis and logs restock purchase expense
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier / Invoice Notes (Optional)
                </label>
                <input
                  type="text"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  placeholder="e.g. Batch #801, Metro Wholesale"
                  className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs text-slate-900 focus:border-amber-600 focus:outline-none"
                />
              </div>

              {restockQty && restockCost && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900 flex justify-between">
                  <span>Total Restock Purchase Value:</span>
                  <span className="font-bold">
                    {currency}{(parseFloat(restockCost) * parseInt(restockQty, 10)).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRestockOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteCandidate}
        title="Delete Product from Inventory"
        message={`Are you sure you want to delete "${deleteCandidate?.name}" (SKU: ${deleteCandidate?.sku})? This product will no longer be available for customer billing.`}
        confirmLabel="Yes, Delete Product"
        cancelLabel="Keep Product"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteCandidate(null)}
      />
    </div>
  );
};
