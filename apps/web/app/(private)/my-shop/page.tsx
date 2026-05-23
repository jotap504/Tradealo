'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Store,
  Pencil,
  Image as ImageIcon,
  Pin,
  LayoutGrid,
  BarChart2,
  CreditCard,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Layout,
  Palette,
  Megaphone,
} from 'lucide-react';
import { shop as shopApi, shopSubscription as subApi } from '@/lib/api';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Shop, ShopSubscription } from '@/types';

const STATUS_META: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  active: { label: 'Activa', variant: 'success' },
  trial: { label: 'Período de prueba', variant: 'default' },
  paused: { label: 'Pausada', variant: 'warning' },
  cancelled: { label: 'Cancelada', variant: 'danger' },
  expired: { label: 'Expirada', variant: 'danger' },
};

const MANAGE_LINKS = [
  { href: '/my-shop/hero', label: 'Hero / Portada', description: 'Estilo visual de la portada', icon: Sparkles, color: 'bg-indigo-50 text-indigo-600' },
  { href: '/my-shop/theme', label: 'Color primario', description: 'Personalizá el color de marca de tu tienda', icon: Palette, color: 'bg-pink-50 text-pink-600' },
  { href: '/my-shop/announcement', label: 'Anuncio / Campaña', description: 'Banner de promoción con fecha de vencimiento', icon: Megaphone, color: 'bg-yellow-50 text-yellow-600' },
  { href: '/my-shop/footer', label: 'Footer / Pie de página', description: 'Elegí el estilo y datos de contacto del footer', icon: Layout, color: 'bg-slate-50 text-slate-600' },
  { href: '/my-shop/edit', label: 'Editar perfil', description: 'Nombre, logo, banner, redes', icon: Pencil, color: 'bg-teal-50 text-teal-600' },
  { href: '/my-shop/gallery', label: 'Galería', description: 'Fotos de tu local/productos', icon: ImageIcon, color: 'bg-blue-50 text-blue-600' },
  { href: '/my-shop/pinned', label: 'Destacados', description: 'Fijá hasta 6 productos', icon: Pin, color: 'bg-orange-50 text-orange-600' },
  { href: '/my-shop/categories', label: 'Categorías', description: 'Orden de categorías', icon: LayoutGrid, color: 'bg-purple-50 text-purple-600' },
  { href: '/my-shop/analytics', label: 'Estadísticas', description: 'Visitas y clics (30 días)', icon: BarChart2, color: 'bg-green-50 text-green-600' },
  { href: '/my-shop/subscription', label: 'Suscripción', description: 'Plan y facturación', icon: CreditCard, color: 'bg-rose-50 text-rose-600' },
];

export default function MyShopPage() {
  const [shopData, setShopData] = useState<Shop | null>(null);
  const [sub, setSub] = useState<ShopSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      shopApi.getMyShop().catch(() => null),
      subApi.getMine().catch(() => null),
    ]).then(([s, su]) => {
      setShopData(s);
      setSub(su);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-tradealo-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const hasActiveSub = sub && (sub.status === 'active' || sub.status === 'trial');
  const subMeta = sub ? (STATUS_META[sub.status] ?? { label: sub.status, variant: 'default' as const }) : null;
  const shopUrl = shopData?.slug ?? shopData?.username;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
          <Store size={22} />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-tradealo-text">Mi Tienda</h1>
          <p className="text-sm text-tradealo-text-muted">Gestioná tu tienda premium en Trocalia</p>
        </div>
      </div>

      {/* Status cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Shop status card */}
        <Card>
          <CardHeader>
            <p className="font-heading font-semibold text-sm text-tradealo-text">Estado de la tienda</p>
          </CardHeader>
          <CardBody>
            {shopData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-tradealo-text truncate">
                    {shopData.shopName ?? 'Sin nombre'}
                  </span>
                  {shopData.isPublished ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 shrink-0">
                      <CheckCircle size={13} /> Publicada
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-tradealo-text-muted shrink-0">
                      <AlertCircle size={13} /> No publicada
                    </span>
                  )}
                </div>
                {shopData.isPublished && shopUrl && (
                  <a
                    href={`/shop/${shopUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-tradealo-primary hover:underline"
                  >
                    <ExternalLink size={12} />
                    Ver mi tienda
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-tradealo-text-muted">No tenés tienda creada aún</p>
            )}
          </CardBody>
        </Card>

        {/* Subscription card */}
        <Card>
          <CardHeader>
            <p className="font-heading font-semibold text-sm text-tradealo-text">Suscripción</p>
          </CardHeader>
          <CardBody>
            {sub ? (
              <div className="space-y-2">
                <Badge variant={subMeta?.variant ?? 'default'}>{subMeta?.label ?? sub.status}</Badge>
                {sub.billingCycleEnd && (
                  <p className="text-xs text-tradealo-text-muted">
                    Próximo cobro: {new Date(sub.billingCycleEnd).toLocaleDateString('es-AR')}
                  </p>
                )}
                <Link href="/my-shop/subscription">
                  <Button variant="ghost" size="sm" className="mt-1">
                    Gestionar plan
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-tradealo-text-muted">Sin suscripción activa</p>
                <Link href="/my-shop/subscription">
                  <Button size="sm">Activar tienda</Button>
                </Link>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Management links */}
      {hasActiveSub ? (
        <div>
          <h2 className="font-heading font-semibold text-base text-tradealo-text mb-3">Gestionar tienda</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MANAGE_LINKS.map(({ href, label, description, icon: Icon, color }) => (
              <Link key={href} href={href} className="group">
                <Card hover>
                  <CardBody>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-tradealo-text group-hover:text-tradealo-primary transition-colors">
                          {label}
                        </p>
                        <p className="text-xs text-tradealo-text-muted truncate">{description}</p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardBody>
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto">
                <Store size={26} className="text-teal-500" />
              </div>
              <div>
                <p className="font-heading font-semibold text-tradealo-text">Tu tienda te espera</p>
                <p className="text-sm text-tradealo-text-muted mt-1">
                  Activá tu suscripción para personalizar tu tienda, publicarla y acceder a estadísticas.
                </p>
              </div>
              <Link href="/my-shop/subscription">
                <Button className="mt-2">Ver planes disponibles</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
