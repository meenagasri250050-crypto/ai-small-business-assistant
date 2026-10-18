import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  PackagePlus, 
  ReceiptText, 
  History, 
  WalletCards, 
  TrendingUp, 
  Sparkles, 
  Store, 
  LogOut,
  X 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  lowStockCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  lowStockCount = 0,
}) => {
  const { logout, userProfile } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { 
      id: 'inventory', 
      label: 'Product Inventory', 
      icon: Package, 
      badge: lowStockCount > 0 ? `${lowStockCount} low` : null,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    { id: 'add-product', label: 'Add Product', icon: PackagePlus },
    { id: 'pos', label: 'New Bill / POS', icon: ReceiptText, highlight: true },
    { id: 'sales', label: 'Sales History', icon: History },
    { id: 'expenses', label: 'Expenses', icon: WalletCards },
    { id: 'reports', label: 'Profit & Loss', icon: TrendingUp },
    { 
      id: 'ai', 
      label: 'AI Business Assistant', 
      icon: Sparkles,
      badge: 'AI',
      badgeColor: 'bg-indigo-100 text-indigo-700'
    },
    { id: 'profile', label: 'Shop Profile', icon: Store },
  ];

  const handleItemClick = (id: string) => {
    onNavigate(id);
    onCloseMobile();
  };

  const content = (
    <div className="flex h-full flex-col justify-between bg-slate-900 text-slate-200">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 font-bold text-white shadow">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-wide text-white">SideHustle AI</span>
              <span className="block text-[10px] text-slate-400">Retail & Profit Manager</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1.5 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item.id)}
                className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : item.highlight
                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 transition ${isActive ? 'text-white' : item.highlight ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 rounded-lg bg-slate-800/60 p-3">
          <div className="text-xs font-semibold text-white truncate">
            {userProfile?.shopName || 'My Retail Shop'}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            Currency: <span className="font-medium text-emerald-400">{userProfile?.currency || '₹'}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition"
        >
          <LogOut className="h-5 w-5" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block border-r border-slate-800">
        <div className="fixed top-0 bottom-0 w-64">
          {content}
        </div>
      </aside>

      {/* Mobile drawer backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {content}
      </div>
    </>
  );
};
