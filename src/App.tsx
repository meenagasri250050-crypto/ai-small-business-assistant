import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthView } from './views/AuthView';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { InventoryView } from './views/InventoryView';
import { BillingPOSView } from './views/BillingPOSView';
import { SalesHistoryView } from './views/SalesHistoryView';
import { ExpensesView } from './views/ExpensesView';
import { ProfitLossView } from './views/ProfitLossView';
import { AiAssistantView } from './views/AiAssistantView';
import { ShopProfileView } from './views/ShopProfileView';
import { PrintReceipt } from './components/PrintReceipt';
import { Product, Invoice, Expense } from './types';
import { 
  subscribeToProducts, 
  subscribeToInvoices, 
  subscribeToExpenses,
  addProduct
} from './services/firestoreService';
import { RefreshCw, Sparkles, Store, ShoppingCart, Plus } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentUser, userProfile, loading } = useAuth();

  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Firestore real-time collections
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Modals / Cross-view navigation state
  const [activeInvoiceForModal, setActiveInvoiceForModal] = useState<Invoice | null>(null);
  const [preselectedProductForRestock, setPreselectedProductForRestock] = useState<Product | null>(null);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setProducts([]);
      setInvoices([]);
      setExpenses([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);

    const unsubProducts = subscribeToProducts(currentUser.uid, (prods) => {
      setProducts(prods);
      setDataLoading(false);
    });

    const unsubInvoices = subscribeToInvoices(currentUser.uid, (invs) => {
      setInvoices(invs);
    });

    const unsubExpenses = subscribeToExpenses(currentUser.uid, (exps) => {
      setExpenses(exps);
    });

    return () => {
      unsubProducts();
      unsubInvoices();
      unsubExpenses();
    };
  }, [currentUser]);

  // Seed initial demo store items for instant testing
  const handleSeedDemoData = async () => {
    if (!currentUser || isSeedingDemo) return;
    setIsSeedingDemo(true);

    const demoItems = [
      { name: 'Organic Herbal Soap 100g', sku: 'SKU-SOAP-01', category: 'Personal Care', purchaseCost: 20, sellingPrice: 35, currentStock: 25, lowStockThreshold: 5 },
      { name: 'Gel Ink Pen (Blue 0.7mm)', sku: 'SKU-PEN-02', category: 'Stationery', purchaseCost: 6, sellingPrice: 12, currentStock: 40, lowStockThreshold: 10 },
      { name: 'Premium Assam Tea 250g', sku: 'SKU-TEA-03', category: 'Grocery', purchaseCost: 75, sellingPrice: 110, currentStock: 4, lowStockThreshold: 5 }, // Low stock
      { name: 'Crunchy Choco Biscuits', sku: 'SKU-BISC-04', category: 'Snacks', purchaseCost: 18, sellingPrice: 30, currentStock: 18, lowStockThreshold: 6 },
      { name: 'Basmati Rice (1kg Pack)', sku: 'SKU-RICE-05', category: 'Grocery', purchaseCost: 65, sellingPrice: 95, currentStock: 15, lowStockThreshold: 5 },
    ];

    try {
      for (const item of demoItems) {
        await addProduct(currentUser.uid, item);
      }
    } catch (err) {
      console.error('Error seeding demo data:', err);
    } finally {
      setIsSeedingDemo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-400" />
          <span className="text-sm font-semibold tracking-wide">Loading AI Small Business Assistant...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView />;
  }

  // Count low stock products
  const lowStockCount = products.filter(p => p.currentStock <= p.lowStockThreshold).length;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'add-product') {
            setCurrentView('inventory');
          } else {
            setCurrentView(view);
          }
        }}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        lowStockCount={lowStockCount}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header Bar */}
        <Navbar
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onNavigate={(view) => setCurrentView(view)}
          lowStockCount={lowStockCount}
        />

        {/* Page Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Quick Demo Store Seeder Banner when 0 products */}
          {products.length === 0 && !dataLoading && (
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Welcome to your new shop! Quick start with demo retail items
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Click to instantly load 5 sample products (Tea, Biscuits, Pens, Rice) to test billing, stock deductions, and P&L.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isSeedingDemo}
                onClick={handleSeedDemoData}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {isSeedingDemo ? (
                  <span>Populating Store...</span>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Load 5 Demo Products</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Active View Routing */}
          {currentView === 'dashboard' && (
            <DashboardView
              products={products}
              invoices={invoices}
              expenses={expenses}
              profile={userProfile}
              onNavigate={(v) => setCurrentView(v)}
              onViewInvoice={(inv) => setActiveInvoiceForModal(inv)}
              onOpenRestock={(prod) => {
                setPreselectedProductForRestock(prod);
                setCurrentView('inventory');
              }}
            />
          )}

          {currentView === 'inventory' && (
            <InventoryView
              products={products}
              profile={userProfile}
              userId={currentUser.uid}
              preselectedProductForRestock={preselectedProductForRestock}
              onClearPreselectedProduct={() => setPreselectedProductForRestock(null)}
            />
          )}

          {currentView === 'pos' && (
            <BillingPOSView
              products={products}
              profile={userProfile}
              userId={currentUser.uid}
            />
          )}

          {currentView === 'sales' && (
            <SalesHistoryView
              invoices={invoices}
              profile={userProfile}
              userId={currentUser.uid}
            />
          )}

          {currentView === 'expenses' && (
            <ExpensesView
              expenses={expenses}
              profile={userProfile}
              userId={currentUser.uid}
            />
          )}

          {currentView === 'reports' && (
            <ProfitLossView
              invoices={invoices}
              expenses={expenses}
              products={products}
              profile={userProfile}
            />
          )}

          {currentView === 'ai' && (
            <AiAssistantView
              products={products}
              invoices={invoices}
              expenses={expenses}
              profile={userProfile}
            />
          )}

          {currentView === 'profile' && (
            <ShopProfileView
              profile={userProfile}
            />
          )}
        </main>
      </div>

      {/* Reusable Receipt Modal */}
      {activeInvoiceForModal && (
        <PrintReceipt
          invoice={activeInvoiceForModal}
          profile={userProfile}
          onClose={() => setActiveInvoiceForModal(null)}
          onStartNewBill={() => {
            setActiveInvoiceForModal(null);
            setCurrentView('pos');
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
