'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Tag,
  ShieldCheck,
  Settings,
  Coins,
  ScrollText,
  Repeat,
  LogOut,
  TicketCheck,
  Swords,
  Flag,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

type AdminRole = 'super_admin' | 'partner' | 'finance' | 'support' | 'moderator';

const ADMIN_ROLES: AdminRole[] = ['super_admin', 'partner', 'finance', 'support', 'moderator'];

function isAdminRole(role: string | undefined): role is AdminRole {
  return ADMIN_ROLES.includes(role as AdminRole);
}

const NAV: { href: string; label: string; icon: React.FC<{ size?: number | string }>; exact?: boolean; roles: AdminRole[] }[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true, roles: ['super_admin', 'partner', 'finance'] },
  { href: '/admin/users', label: 'Usuarios', icon: Users, roles: ['super_admin', 'partner', 'support'] },
  { href: '/admin/listings', label: 'Listings', icon: Tag, roles: ['super_admin', 'partner', 'moderator'] },
  { href: '/admin/kyc', label: 'KYC', icon: ShieldCheck, roles: ['super_admin', 'partner', 'moderator'] },
  { href: '/admin/tickets', label: 'Tickets', icon: TicketCheck, roles: ['super_admin', 'partner', 'support'] },
  { href: '/admin/disputes', label: 'Disputas', icon: Swords, roles: ['super_admin', 'partner', 'support'] },
  { href: '/admin/reports', label: 'Denuncias', icon: Flag, roles: ['super_admin', 'partner', 'support', 'moderator'] },
  { href: '/admin/token-packs', label: 'Token Packs', icon: Coins, roles: ['super_admin', 'finance'] },
  { href: '/admin/config', label: 'Config', icon: Settings, roles: ['super_admin'] },
  { href: '/admin/audit-log', label: 'Audit Log', icon: ScrollText, roles: ['super_admin', 'finance'] },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const initialize = useAuthStore((s) => s.initialize);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!initialized) return;
    if (pathname === '/admin/login') return;
    if (!user || !isAdminRole(user.role)) {
      router.replace('/admin/login');
    }
  }, [initialized, user, router, pathname]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (!initialized || !user || !isAdminRole(user.role)) return null;

  const visibleNav = NAV.filter((item) => item.roles.includes(user.role as AdminRole));

  const onLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-tradealo-bg">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-gray-900 text-white flex flex-col">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-white/10">
          <span className="w-8 h-8 rounded-lg bg-tradealo-primary flex items-center justify-center">
            <Repeat size={16} strokeWidth={2.5} />
          </span>
          <span className="font-heading font-bold text-base">
            Tradealo Admin
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
          {visibleNav.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href) && item.href !== '/admin';
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-tradealo-primary text-white'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 py-4 border-t border-white/10">
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <Avatar src={user.avatarUrl} username={user.username ?? user.email} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{user.username ?? user.email}</p>
              <p className="text-xs text-gray-500 truncate">{user.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/10 hover:text-white w-full text-left transition-colors"
          >
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-tradealo-border flex items-center justify-between px-6 shrink-0">
          <p className="font-heading font-semibold text-tradealo-text">
            Panel CEO
          </p>
          <div className="flex items-center gap-2">
            <Avatar
              src={user.avatarUrl}
              username={user.username ?? user.email}
              size="sm"
            />
            <span className="text-sm font-medium text-tradealo-text">
              {user.username ?? user.email}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
