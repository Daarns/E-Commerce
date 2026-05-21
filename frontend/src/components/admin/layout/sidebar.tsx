'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback, createContext, useContext } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  Ticket,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Context ──────────────────────────────────────────────────────────────────
interface SidebarCtx {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleSidebar: () => void; // single unified toggle — adapts to viewport
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarCtx>({
  isCollapsed: false,
  isMobileOpen: false,
  toggleSidebar: () => { },
  closeMobile: () => { },
});

export function useSidebar() {
  return useContext(SidebarContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // All useCallback at top-level — NOT inside an object literal (Rules of Hooks)
  const toggleSidebar = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileOpen((v) => !v);
    } else {
      setIsCollapsed((v) => !v);
    }
  }, []);

  const closeMobile = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  return (
    <SidebarContext.Provider
      value={{ isCollapsed, isMobileOpen, toggleSidebar, closeMobile }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// ─── Burger Button (header-only toggle) ───────────────────────────────────────
export function BurgerButton({ className }: { className?: string }) {
  const { isCollapsed, isMobileOpen, toggleSidebar } = useSidebar();
  const isOpen = !isCollapsed || isMobileOpen;

  return (
    <button
      onClick={toggleSidebar}
      aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      className={cn(
        'flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-lg',
        'text-foreground hover:bg-muted transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
    >
      <span
        className={cn(
          'block h-[2px] w-5 rounded-full bg-current origin-center',
          'transition-transform duration-200 ease-in-out',
          isOpen && 'translate-y-[7px] rotate-45'
        )}
      />
      <span
        className={cn(
          'block h-[2px] w-5 rounded-full bg-current',
          'transition-opacity duration-200 ease-in-out',
          isOpen && 'opacity-0'
        )}
      />
      <span
        className={cn(
          'block h-[2px] w-5 rounded-full bg-current origin-center',
          'transition-transform duration-200 ease-in-out',
          isOpen && '-translate-y-[7px] -rotate-45'
        )}
      />
    </button>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────
const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Promo Codes', href: '/admin/promo-codes', icon: Ticket },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export function AdminSidebar() {
  const pathname = usePathname();
  const { isCollapsed, isMobileOpen, closeMobile } = useSidebar();

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={closeMobile}
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-30 bg-black/40 md:hidden',
          'transition-opacity duration-200',
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Sidebar panel */}
      <aside
        aria-label="Admin navigation"
        className={cn(
          'flex flex-col shrink-0 bg-card border-r border-border',
          // Desktop: width transition only (cheap — no layout reflow cascade)
          'hidden md:flex',
          'transition-[width] duration-200 ease-in-out',
          isCollapsed ? 'w-16' : 'w-60',
          // Mobile: fixed positioned drawer
          'max-md:!flex max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40',
          'max-md:w-72 max-md:shadow-2xl',
          'max-md:transition-transform max-md:duration-200 max-md:ease-in-out',
          isMobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
        )}
      >
        {/* Brand area — no toggle button here; burger lives in the header */}
        <div className={cn(
          'flex items-center h-[60px] border-b border-border shrink-0 px-4',
          isCollapsed ? 'justify-center' : 'justify-start gap-2'
        )}>
          {/* Compact icon mark when collapsed */}
          <div className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
            'bg-primary text-primary-foreground text-xs font-bold select-none'
          )}>
            A
          </div>
          {/* Brand text — hidden when collapsed using max-w transition (fast) */}
          <div className={cn(
            'overflow-hidden transition-[max-width,opacity] duration-200 ease-in-out whitespace-nowrap',
            isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'
          )}>
            <p className="text-sm font-bold tracking-widest leading-none">ADMIN</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Control Panel</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                onClick={closeMobile}
                className={cn(
                  'group relative flex items-center rounded-md',
                  // Width transition: icons always visible, label slides in/out
                  isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  'transition-colors duration-150'
                )}
              >
                {/* Active left accent */}
                {isActive && (
                  <span className="absolute left-0 inset-y-[20%] w-[3px] rounded-r-full bg-primary-foreground/40" />
                )}

                <Icon className="h-[18px] w-[18px] shrink-0" />

                {/* Label: max-width transition is GPU-friendly (no reflow) */}
                <span className={cn(
                  'text-sm font-medium whitespace-nowrap overflow-hidden leading-none',
                  'transition-[max-width,opacity] duration-200 ease-in-out',
                  isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'
                )}>
                  {item.label}
                </span>

                {/* Tooltip (desktop collapsed only) */}
                {isCollapsed && (
                  <span className={cn(
                    'pointer-events-none absolute left-full ml-2 z-50 hidden md:block',
                    'rounded-md bg-popover text-popover-foreground border border-border',
                    'px-2.5 py-1 text-xs font-medium shadow-md whitespace-nowrap',
                    'opacity-0 group-hover:opacity-100 transition-opacity duration-150'
                  )}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-3 py-3">
          <p className={cn(
            'text-center text-[10px] text-muted-foreground whitespace-nowrap overflow-hidden',
            'transition-[max-height,opacity] duration-200',
            isCollapsed ? 'max-h-0 opacity-0' : 'max-h-8 opacity-100'
          )}>
            E-Commerce Admin v1.0
          </p>
        </div>
      </aside>
    </>
  );
}
