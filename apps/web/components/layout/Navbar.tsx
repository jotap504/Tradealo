'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  Menu,
  X,
  Plus,
  ChevronDown,
  User as UserIcon,
  ListChecks,
  TrendingUp,
  Wallet,
  ShieldCheck,
  LogOut,
  Search,
  Repeat,
  MessageCircle,
  Heart,
  LifeBuoy,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { Avatar } from '@/components/ui/Avatar';
import { TierBadge } from '@/components/ui/TierBadge';
import { Button } from '@/components/ui/Button';
import { NotificationBell } from './NotificationBell';
import { MessageBell } from './MessageBell';
import { cn } from '@/lib/utils';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const onLogout = async () => {
    await logout();
    router.push('/');
  };

  const navLinks = [
    { href: '/', label: 'Inicio' },
    { href: '/listings', label: 'Buscar' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-tradealo-border shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 group"
          aria-label="Tradealo inicio"
        >
          <span className="w-8 h-8 rounded-lg bg-tradealo-primary flex items-center justify-center text-white shadow-sm group-hover:bg-tradealo-primary-hover transition-colors">
            <Repeat size={16} strokeWidth={2.5} />
          </span>
          <span className="font-heading font-bold text-lg text-tradealo-primary tracking-tight">
            Tradealo
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-2">
          {navLinks.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'text-tradealo-primary bg-tradealo-primary-light'
                    : 'text-tradealo-text hover:bg-gray-100'
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex flex-1 max-w-sm mx-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const q = String(fd.get('q') ?? '').trim();
              router.push(q ? `/listings?q=${encodeURIComponent(q)}` : '/listings');
            }}
            className="relative w-full"
          >
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-tradealo-text-muted pointer-events-none"
            />
            <input
              name="q"
              placeholder="Buscar…"
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-tradealo-border bg-gray-50 text-sm focus:outline-none focus:bg-white focus:border-tradealo-primary focus:ring-2 focus:ring-tradealo-primary-light"
            />
          </form>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {user ? (
            <>
              <Link href="/my-listings/new" className="hidden sm:block">
                <Button size="md" leftIcon={<Plus size={16} />}>
                  Publicar
                </Button>
              </Link>
              <MessageBell />
              <NotificationBell />
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <Avatar
                    src={user.avatarUrl}
                    username={user.username ?? user.email}
                    size="sm"
                  />
                  <ChevronDown size={14} className="text-tradealo-text-muted" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-tradealo-border rounded-xl shadow-lg z-50 overflow-hidden animate-slide-up">
                    <div className="px-4 py-3 border-b border-tradealo-border">
                      <p className="text-sm font-medium truncate flex items-center gap-1.5">
                        {user.username ?? user.email}
                        <TierBadge level={user.kycLevel} />
                      </p>
                      <p className="text-xs text-tradealo-text-muted truncate">
                        {user.email}
                      </p>
                    </div>
                    <DropdownLink
                      href="/dashboard"
                      icon={<UserIcon size={15} />}
                      label="Mi panel"
                    />
                    <DropdownLink
                      href="/profile"
                      icon={<UserIcon size={15} />}
                      label="Mi perfil"
                    />
                    <DropdownLink
                      href="/my-listings"
                      icon={<ListChecks size={15} />}
                      label="Mis publicaciones"
                    />
                    <DropdownLink
                      href="/my-sales"
                      icon={<TrendingUp size={15} />}
                      label="Mis ventas"
                    />
                    <DropdownLink
                      href="/my-purchases"
                      icon={<ShoppingBag size={15} />}
                      label="Mis compras"
                    />
                    <DropdownLink
                      href="/favorites"
                      icon={<Heart size={15} />}
                      label="Favoritos"
                    />
                    <DropdownLink
                      href="/messages"
                      icon={<MessageCircle size={15} />}
                      label="Mensajes"
                    />
                    <DropdownLink
                      href="/wallet"
                      icon={<Wallet size={15} />}
                      label="Billetera"
                    />
                    <DropdownLink
                      href="/kyc"
                      icon={<ShieldCheck size={15} />}
                      label="Verificación KYC"
                    />
                    <DropdownLink
                      href="/support"
                      icon={<LifeBuoy size={15} />}
                      label="Soporte"
                    />
                    <DropdownLink
                      href="/my-shop"
                      icon={<Store size={15} />}
                      label="Mi Tienda"
                    />
                    <button
                      onClick={onLogout}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 text-tradealo-error border-t border-tradealo-border"
                    >
                      <LogOut size={15} />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="md">
                  Ingresar
                </Button>
              </Link>
              <Link href="/register">
                <Button size="md">Registrarse</Button>
              </Link>
            </>
          )}

          {!user && (
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-4 h-16 border-b border-tradealo-border">
              <span className="font-heading font-bold text-lg text-tradealo-primary">
                Tradealo
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="Cerrar menú"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-col p-2">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-gray-100"
                >
                  {l.label}
                </Link>
              ))}
              {user && (
                <>
                  <Link
                    href="/dashboard"
                    className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-gray-100"
                  >
                    Mi panel
                  </Link>
                  <Link
                    href="/my-listings"
                    className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-gray-100"
                  >
                    Mis publicaciones
                  </Link>
                  <Link
                    href="/my-sales"
                    className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-gray-100"
                  >
                    Mis ventas
                  </Link>
                  <Link
                    href="/my-purchases"
                    className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-gray-100"
                  >
                    Mis compras
                  </Link>
                  <Link
                    href="/favorites"
                    className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-gray-100"
                  >
                    Favoritos
                  </Link>
                  <Link
                    href="/messages"
                    className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-gray-100"
                  >
                    Mensajes
                  </Link>
                  <Link
                    href="/wallet"
                    className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-gray-100"
                  >
                    Billetera
                  </Link>
                  <Link
                    href="/kyc"
                    className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-gray-100"
                  >
                    Verificación
                  </Link>
                  <Link
                    href="/support"
                    className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-gray-100"
                  >
                    Soporte
                  </Link>
                  <Link
                    href="/my-shop"
                    className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-gray-100"
                  >
                    Mi Tienda
                  </Link>
                </>
              )}
            </nav>
            <div className="mt-auto p-4 border-t border-tradealo-border space-y-2">
              {user ? (
                <>
                  <Link href="/my-listings/new">
                    <Button fullWidth leftIcon={<Plus size={16} />}>
                      Publicar
                    </Button>
                  </Link>
                  <Button
                    fullWidth
                    variant="ghost"
                    onClick={onLogout}
                    leftIcon={<LogOut size={16} />}
                  >
                    Cerrar sesión
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/register">
                    <Button fullWidth>Registrarse</Button>
                  </Link>
                  <Link href="/login">
                    <Button fullWidth variant="secondary">
                      Ingresar
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}

function DropdownLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 text-tradealo-text"
    >
      <span className="text-tradealo-text-muted">{icon}</span>
      {label}
    </Link>
  );
}
