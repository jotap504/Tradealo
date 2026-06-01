'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CreditCard,
  Check,
  Trash2,
  ExternalLink,
  Wallet,
  Info,
} from 'lucide-react';
import {
  paymentCredentials,
  type PaymentCredentialSummary,
} from '@/lib/api';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/lib/store';

interface ProviderMeta {
  id: 'mercadopago' | 'stripe' | 'cbu';
  name: string;
  description: string;
  status: 'available' | 'comingSoon';
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'mercadopago',
    name: 'MercadoPago',
    description:
      'Cobrá con tarjeta, dinero en cuenta o pago en efectivo. Los pagos caen directo en tu cuenta MP.',
    status: 'available',
  },
  {
    id: 'cbu',
    name: 'Transferencia bancaria (CBU/Alias)',
    description:
      'Permití que tus compradores te transfieran directo. Sin comisiones de Trocalia.',
    status: 'comingSoon',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Para compradores internacionales que paguen en USD.',
    status: 'comingSoon',
  },
];

export default function PaymentsPage() {
  const [mpCreds, setMpCreds] = useState<PaymentCredentialSummary | null>(null);
  const [mpToken, setMpToken] = useState('');
  const [savingMp, setSavingMp] = useState(false);
  const [deletingMp, setDeletingMp] = useState(false);
  const [editingMp, setEditingMp] = useState(false);

  useEffect(() => {
    paymentCredentials
      .get()
      .then(setMpCreds)
      .catch(() => setMpCreds({ hasCredential: false }));
  }, []);

  const handleSaveMpToken = async () => {
    if (!mpToken.trim()) {
      toast.error('Pegá tu Access Token de MercadoPago');
      return;
    }
    setSavingMp(true);
    try {
      const result = await paymentCredentials.upsert(mpToken.trim());
      setMpCreds(result);
      setMpToken('');
      setEditingMp(false);
      toast.success('Cuenta de MercadoPago conectada');
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'No se pudo validar el token con MercadoPago';
      toast.error(msg);
    } finally {
      setSavingMp(false);
    }
  };

  const handleDeleteMp = async () => {
    if (
      !confirm(
        '¿Desconectar tu cuenta de MercadoPago? Los listings agéntico-comprables dejarán de funcionar hasta que conectes otro método.',
      )
    )
      return;
    setDeletingMp(true);
    try {
      await paymentCredentials.remove();
      setMpCreds({ hasCredential: false });
      toast.success('Cuenta de MercadoPago desconectada');
    } catch {
      toast.error('No se pudo desconectar');
    } finally {
      setDeletingMp(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/my-shop"
          className="text-tradealo-text-muted hover:text-tradealo-text"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <Wallet size={20} />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-tradealo-text">
              Métodos de pago
            </h1>
            <p className="text-sm text-tradealo-text-muted">
              Cómo cobrás las ventas de tu tienda
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardBody className="flex items-start gap-3">
          <Info size={16} className="text-tradealo-primary mt-0.5 shrink-0" />
          <div className="space-y-1 text-sm">
            <p className="text-tradealo-text">
              Para habilitar las compras automáticas por agentes IA, necesitás
              tener al menos un método de pago activo.
            </p>
            <p className="text-xs text-tradealo-text-muted">
              Los datos sensibles (tokens, claves) se guardan{' '}
              <strong>encriptados AES-256</strong> y nunca se exponen por HTTP.
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CreditCard size={14} className="text-tradealo-primary" />
              <p className="font-heading font-semibold text-sm">MercadoPago</p>
            </div>
            {mpCreds?.hasCredential && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                <Check size={12} />
                Conectado
              </span>
            )}
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {mpCreds?.hasCredential && !editingMp ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm">
                {mpCreds.mpUserId && (
                  <p className="text-green-900">
                    Usuario MP:{' '}
                    <span className="font-mono">{mpCreds.mpUserId}</span>
                  </p>
                )}
                <p className="text-xs text-green-700 mt-0.5">
                  Token:{' '}
                  <span className="font-mono">{mpCreds.tokenPreview}</span>
                </p>
                {mpCreds.lastValidatedAt && (
                  <p className="text-xs text-green-700">
                    Validado:{' '}
                    {new Date(mpCreds.lastValidatedAt).toLocaleString('es-AR')}
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditingMp(true)}
                >
                  Reemplazar token
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={deletingMp}
                  onClick={handleDeleteMp}
                  leftIcon={<Trash2 size={14} />}
                >
                  Desconectar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-tradealo-text-muted">
                Pegá tu <strong>Access Token de Producción</strong> de
                MercadoPago. Los pagos caen directo en TU cuenta de MP.
              </p>
              <a
                href="https://www.mercadopago.com.ar/developers/panel/app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-tradealo-primary hover:underline inline-flex items-center gap-1"
              >
                Abrir MP Developer Panel
                <ExternalLink size={11} />
              </a>
              <Input
                label="Access Token"
                placeholder="APP_USR-..."
                value={mpToken}
                onChange={(e) => setMpToken(e.target.value)}
                type="password"
                autoComplete="off"
                disabled={savingMp}
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveMpToken} loading={savingMp}>
                  {editingMp ? 'Guardar nuevo token' : 'Conectar MercadoPago'}
                </Button>
                {editingMp && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingMp(false);
                      setMpToken('');
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {PROVIDERS.filter((p) => p.status === 'comingSoon').map((p) => (
        <Card key={p.id} className="opacity-70">
          <CardBody>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-heading font-semibold text-sm text-tradealo-text">
                  {p.name}
                </p>
                <p className="text-xs text-tradealo-text-muted mt-1">
                  {p.description}
                </p>
              </div>
              <span className="text-xs font-medium text-tradealo-text-muted shrink-0 px-2 py-1 rounded-full border">
                Próximamente
              </span>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
