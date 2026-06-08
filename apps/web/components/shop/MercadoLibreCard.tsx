'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { mercadolibre, type MlConnection } from '@/lib/api';
import { toast } from '@/lib/store';

export function MercadoLibreCard() {
  const sp = useSearchParams();
  const router = useRouter();
  const [conn, setConn] = useState<MlConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    mercadolibre
      .getConnection()
      .then(setConn)
      .catch(() => setConn({ connected: false }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const flag = sp.get('ml');
    if (!flag) return;
    if (flag === 'connected') toast.success('Cuenta de MercadoLibre conectada');
    else if (flag === 'blocked_site')
      toast.error(
        'Solo cuentas de MercadoLibre Argentina (MLA) están soportadas.',
      );
    else if (flag === 'error') {
      const reason = sp.get('reason');
      toast.error(
        reason
          ? `No se pudo conectar: ${decodeURIComponent(reason)}`
          : 'No se pudo completar la conexión con MercadoLibre.',
      );
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('ml');
    router.replace(url.pathname + url.search, { scroll: false });
  }, [sp, router]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { url } = await mercadolibre.getAuthorizeUrl();
      window.location.href = url;
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'No se pudo iniciar la conexión';
      toast.error(msg);
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('¿Desconectar tu cuenta de MercadoLibre?')) return;
    try {
      await mercadolibre.disconnect();
      setConn({ connected: false });
      toast.success('Cuenta desconectada');
    } catch {
      toast.error('No se pudo desconectar');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600">
          <ShoppingBag size={20} />
        </div>
        <div>
          <h2 className="font-heading text-lg font-bold text-tradealo-text">
            Importar desde MercadoLibre
          </h2>
          <p className="text-sm text-tradealo-text-muted">
            Conectá tu cuenta y dejá que la IA arme los borradores por vos.
          </p>
        </div>
      </div>

      <Card>
        <CardBody className="space-y-3">
          {loading ? (
            <p className="text-sm text-tradealo-text-muted">Cargando…</p>
          ) : conn?.connected ? (
            <>
              <div>
                <p className="text-sm text-tradealo-text">
                  Conectado como{' '}
                  <strong>{conn.nickname ?? conn.externalUserId}</strong> (
                  {conn.siteId ?? 'MLA'}).
                </p>
                <p className="text-xs text-tradealo-text-muted mt-0.5">
                  Token vigente hasta{' '}
                  {conn.expiresAt
                    ? new Date(conn.expiresAt).toLocaleString('es-AR')
                    : '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/my-shop/integrations/mercadolibre">
                  <Button size="sm">Importar productos</Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDisconnect}
                  className="text-tradealo-error"
                >
                  <Trash2 size={14} className="mr-1" /> Desconectar
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-tradealo-text">
                Importá tu catálogo de MercadoLibre. La IA reescribe título y
                descripción y deja los borradores listos para que los confirmes.
              </p>
              <p className="text-xs text-tradealo-text-muted">
                Requiere <strong>Mi Tienda activa</strong>. Solo cuentas
                argentinas (MLA).
              </p>
              <Button size="sm" onClick={handleConnect} loading={connecting}>
                Conectar con MercadoLibre
              </Button>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
