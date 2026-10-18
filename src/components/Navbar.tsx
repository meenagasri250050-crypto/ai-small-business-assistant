import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Store, User as UserIcon, LogOut, Menu, ShoppingCart, Sparkles, Bell } from 'lucide-react';

interface NavbarProps {
  onToggleMobileMenu: () => void;
  onNavigate: (view: string) => void;
  lowStockCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu, onNavigate, lowStockCount }) => {
  const { userProfile, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-100">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-slate-900 sm:text-lg">
              {userProfile?.shopName || 'Retail Hub'}
            </h1>
            <p className="text-xs text-slate-700">
              {userProfile?.name ? `Owner: ${userProfile.name}` : 'Small Business Edition'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick New Bill Button */}
        <button
          type="button"
          onClick={() => onNavigate('pos')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition sm:px-3.5 sm:py-2 sm:text-sm"
        >
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden sm:inline">New Bill</span>
          <span className="sm:hidden">Bill</span>
        </button>

        {/* AI Assistant Quick Link */}
        <button
          type="button"
          onClick={() => onNavigate('ai')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition sm:px-3 sm:py-2"
        >
          <Sparkles className="h-4 w-4 text-indigo-600" />
          <span className="hidden md:inline">AI Advisor</span>
        </button>

        {/* Low Stock Indicator */}
        {lowStockCount > 0 && (
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="relative flex items-center justify-center rounded-lg p-2 text-amber-600 hover:bg-amber-50"
            title={`${lowStockCount} product(s) in low stock`}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
              {lowStockCount}
            </span>
          </button>
        )}

        {/* Profile / Logout */}
        <div className="flex items-center pl-2 border-l border-slate-200 gap-2">
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="flex items-center gap-2 rounded-lg p-1.5 text-slate-700 hover:bg-slate-100"
            title="Shop Settings & Profile"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-semibold text-xs border border-slate-300">
              {userProfile?.name?.charAt(0).toUpperCase() || <UserIcon className="h-4 w-4" />}
            </div>
            <span className="hidden xl:inline text-xs font-medium text-slate-700 max-w-[120px] truncate">
              {userProfile?.email}
            </span>
          </button>

          <button
            type="button"
            onClick={() => logout()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
