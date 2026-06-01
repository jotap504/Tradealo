'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, QrCode } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { APP_URL } from '@/lib/constants';

interface Props {
  username: string | null | undefined;
  shopName?: string | null;
}

export function ShopQRCard({ username, shopName }: Props) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  const shopUrl = username
    ? `${APP_URL.replace(/\/$/, '')}/shop/${username}`
    : '';

  useEffect(() => {
    if (!shopUrl) return;
    let cancelled = false;
    QRCode.toDataURL(shopUrl, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [shopUrl]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    const safeName = (shopName ?? username ?? 'trocalia-shop')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');
    a.download = `${safeName}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!username) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <QrCode size={14} className="text-tradealo-primary" />
          <p className="font-heading font-semibold text-sm">
            Código QR de tu tienda
          </p>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-tradealo-text-muted">
          Imprimilo y pegalo donde quieras (vidriera, packaging, tarjeta
          personal). Cualquier persona que lo escanee llega directo a tu tienda.
        </p>

        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-32 h-32 rounded-xl border bg-white flex items-center justify-center shrink-0 overflow-hidden">
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl}
                alt="QR de la tienda"
                className="w-full h-full"
              />
            ) : error ? (
              <p className="text-xs text-red-600 p-2">{error}</p>
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-tradealo-primary border-t-transparent animate-spin" />
            )}
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            <p className="text-xs text-tradealo-text-muted">URL</p>
            <code className="block text-xs font-mono p-2 rounded-lg bg-gray-50 border break-all">
              {shopUrl}
            </code>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Download size={14} />}
              disabled={!dataUrl}
              onClick={handleDownload}
            >
              Descargar QR
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
