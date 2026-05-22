'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useReducedMotion } from 'framer-motion';
import { LogOut, User as UserIcon, Store, ListChecks, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { MessageBell } from '@/components/layout/MessageBell';

interface ShopNavProps {
  shopName: string | null;
  logoUrl: string | null;
  username: string;
}

export default function ShopNav({ shopName, logoUrl, username }: ShopNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const prefersReduced = useReducedMotion();
  const menuRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const trans = prefersReduced ? {} : { transition: 'background-color 0.3s ease, box-shadow 0.3s ease' };
  const textColor = scrolled ? 'var(--shop-text)' : '#ffffff';
  const textShadow = scrolled ? 'none' : '0 1px 4px rgba(0,0,0,0.4)';

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-4 py-3"
      style={{
        backgroundColor: scrolled ? 'var(--shop-surface)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        boxShadow: scrolled ? '0 1px 16px rgba(0,0,0,0.10)' : 'none',
        ...trans,
      }}
    >
      {/* Left: logo + name */}
      <div className="flex items-center gap-3">
        {logoUrl && (
          <div
            className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0"
            style={{ border: `2px solid ${scrolled ? 'var(--shop-border)' : 'rgba(255,255,255,0.7)'}`, ...trans }}
          >
            <Image src={logoUrl} alt={shopName ?? 'Logo'} fill className="object-cover" />
          </div>
        )}
        <span
          className="font-bold text-sm truncate max-w-[160px]"
          style={{ color: textColor, textShadow, ...trans }}
        >
          {shopName ?? username}
        </span>
      </div>

      {/* Right: user icons + Trocalia link */}
      <div className="flex items-center gap-1">
        {user && (
          <>
            <div style={{ color: textColor }}>
              <MessageBell />
            </div>
            <div style={{ color: textColor }}>
              <NotificationBell />
            </div>

            {/* User dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-xs font-medium"
                style={{
                  color: textColor,
                  backgroundColor: scrolled ? 'var(--shop-border)' : 'rgba(255,255,255,0.15)',
                  border: `1px solid ${scrolled ? 'var(--shop-border)' : 'rgba(255,255,255,0.30)'}`,
                  ...trans,
                }}
              >
                {user.avatarUrl ? (
                  <div className="relative w-5 h-5 rounded-full overflow-hidden">
                    <Image src={user.avatarUrl} alt="" fill className="object-cover" />
                  </div>
                ) : (
                  <UserIcon size={14} />
                )}
                <span className="hidden sm:inline max-w-[80px] truncate">{user.username ?? 'Menú'}</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden text-gray-800">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold truncate">{user.username ?? user.email}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <NavItem href="/my-shop" icon={<Store size={14} />} label="Mi Tienda" onClick={() => setMenuOpen(false)} />
                  <NavItem href="/my-listings" icon={<ListChecks size={14} />} label="Mis publicaciones" onClick={() => setMenuOpen(false)} />
                  <NavItem href="/my-purchases" icon={<ShoppingBag size={14} />} label="Mis compras" onClick={() => setMenuOpen(false)} />
                  <NavItem href={`/seller/${username}`} icon={<UserIcon size={14} />} label="Ver perfil público" onClick={() => setMenuOpen(false)} />
                  <button
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"
                  >
                    <LogOut size={14} /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {!user && (
          <Link
            href="/login"
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{
              color: textColor,
              backgroundColor: scrolled ? 'var(--shop-border)' : 'rgba(255,255,255,0.18)',
              border: `1px solid ${scrolled ? 'var(--shop-border)' : 'rgba(255,255,255,0.35)'}`,
              ...trans,
            }}
          >
            Ingresar
          </Link>
        )}
      </div>
    </nav>
  );
}

function NavItem({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50"
    >
      {icon} {label}
    </Link>
  );
}
