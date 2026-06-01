'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plug,
  Plus,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import {
  apiTokens,
  paymentCredentials,
  type ApiTokenSummary,
  type CreatedApiToken,
  type PaymentCredentialSummary,
} from '@/lib/api';
import { API_URL } from '@/lib/constants';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/lib/store';

function formatRelative(iso: string | null): string {
  if (!iso) return 'Nunca';
  const date = new Date(iso);
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 60_000) return 'hace unos segundos';
  if (diff < 3_600_000) return `hace ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `hace ${Math.floor(diff / 3_600_000)} h`;
  return date.toLocaleDateString('es-AR');
}

export default function IntegrationsPage() {
  const [tokens, setTokens] = useState<ApiTokenSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [justCreated, setJustCreated] = useState<CreatedApiToken | null>(null);
  const [copied, setCopied] = useState<'token' | 'config' | null>(null);

  const [mpCreds, setMpCreds] = useState<PaymentCredentialSummary | null>(null);
  const [mpToken, setMpToken] = useState('');
  const [savingMp, setSavingMp] = useState(false);
  const [deletingMp, setDeletingMp] = useState(false);

  useEffect(() => {
    apiTokens.list().then(setTokens).catch(() => setTokens([]));
    paymentCredentials.get().then(setMpCreds).catch(() => setMpCreds({ hasCredential: false }));
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
    if (!confirm('¿Desconectar tu cuenta de MercadoPago? Los listings agéntico-comprables dejarán de funcionar.')) return;
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

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Ponéle un nombre al token (ej: "Claude Desktop")');
      return;
    }
    setCreating(true);
    try {
      const created = await apiTokens.create(newName.trim());
      setJustCreated(created);
      setNewName('');
      setTokens((prev) => (prev ? [created, ...prev] : [created]));
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'No se pudo crear el token';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`¿Revocar el token "${name}"? El agente conectado dejará de funcionar.`)) return;
    setRevoking(id);
    try {
      await apiTokens.revoke(id);
      setTokens((prev) => (prev ? prev.filter((t) => t.id !== id) : prev));
      toast.success('Token revocado');
    } catch {
      toast.error('No se pudo revocar el token');
    } finally {
      setRevoking(null);
    }
  };

  const copy = (text: string, which: 'token' | 'config') => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const mcpUrl = `${API_URL.replace(/\/$/, '')}/mcp/shop`;
  const configSnippet = justCreated
    ? JSON.stringify(
        {
          mcpServers: {
            trocalia: {
              type: 'streamable-http',
              url: mcpUrl,
              headers: { Authorization: `Bearer ${justCreated.token}` },
            },
          },
        },
        null,
        2,
      )
    : '';

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/my-shop" className="text-tradealo-text-muted hover:text-tradealo-text">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
            <Plug size={20} />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-tradealo-text">Agentes IA (MCP)</h1>
            <p className="text-sm text-tradealo-text-muted">
              Conectá Claude o ChatGPT a tu tienda para que cargue productos por vos.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardBody className="space-y-2">
          <p className="text-sm text-tradealo-text">
            Generá un <strong>token de acceso</strong> y conectalo a tu agente IA. El agente
            podrá crear listings, subir fotos y consultar tu catálogo en tu nombre.
          </p>
          <p className="text-xs text-tradealo-text-muted">
            Por default los listings que cree el agente quedan como borrador para que los
            revises antes de publicarlos. Si querés autopublicación, activá el toggle en{' '}
            <Link href="/my-shop/edit" className="text-tradealo-primary hover:underline">
              Editar perfil
            </Link>.
          </p>
        </CardBody>
      </Card>

      {justCreated && (
        <Card className="border-2 border-amber-300">
          <CardHeader className="bg-amber-50">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <p className="font-heading font-semibold text-sm text-amber-900">
                Copiá tu token AHORA — no se va a volver a mostrar
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <p className="text-xs text-tradealo-text-muted mb-1">Token</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border text-xs break-all font-mono">
                  {justCreated.token}
                </code>
                <Button
                  size="sm"
                  variant={'secondary'}
                  onClick={() => copy(justCreated.token, 'token')}
                >
                  {copied === 'token' ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs text-tradealo-text-muted mb-1">
                Pegá esto en tu <code className="font-mono">claude_desktop_config.json</code>:
              </p>
              <div className="relative">
                <pre className="px-3 py-3 rounded-lg bg-gray-900 text-gray-100 text-xs overflow-x-auto font-mono whitespace-pre">
{configSnippet}
                </pre>
                <Button
                  size="sm"
                  variant={'secondary'}
                  className="absolute top-2 right-2"
                  onClick={() => copy(configSnippet, 'config')}
                >
                  {copied === 'config' ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setJustCreated(null)}
              className="text-tradealo-text-muted"
            >
              Cerrar — ya lo copié
            </Button>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard size={14} className="text-tradealo-primary" />
            <p className="font-heading font-semibold text-sm">
              Cuenta MercadoPago para cobros
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {mpCreds?.hasCredential ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                <Check size={16} className="text-green-600 mt-0.5 shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-green-900">
                    Cuenta conectada
                  </p>
                  <p className="text-xs text-green-700 mt-0.5">
                    {mpCreds.mpUserId && (
                      <>Usuario MP: <span className="font-mono">{mpCreds.mpUserId}</span> · </>
                    )}
                    Token: <span className="font-mono">{mpCreds.tokenPreview}</span>
                  </p>
                  {mpCreds.lastValidatedAt && (
                    <p className="text-xs text-green-700">
                      Validado: {new Date(mpCreds.lastValidatedAt).toLocaleString('es-AR')}
                    </p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                loading={deletingMp}
                onClick={handleDeleteMp}
                leftIcon={<Trash2 size={14} />}
              >
                Desconectar MercadoPago
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-tradealo-text-muted">
                Pegá tu <strong>Access Token de Producción</strong> de MercadoPago. Los
                pagos por compras agénticas caen directo en TU cuenta de MP. Tu token se
                guarda <strong>encriptado AES-256</strong> en nuestra DB y nunca se loggea.
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
              <Button onClick={handleSaveMpToken} loading={savingMp}>
                Conectar MercadoPago
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="font-heading font-semibold text-sm">Crear nuevo token</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <Input
            label="Nombre del token"
            placeholder='Ej: "Claude Desktop", "ChatGPT mobile"'
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={80}
            disabled={creating}
          />
          <Button onClick={handleCreate} loading={creating} leftIcon={<Plus size={14} />}>
            Generar token
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="font-heading font-semibold text-sm">Tokens activos</p>
        </CardHeader>
        <CardBody>
          {tokens === null ? (
            <p className="text-sm text-tradealo-text-muted py-4 text-center">Cargando…</p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-tradealo-text-muted py-4 text-center">
              No tenés tokens activos.
            </p>
          ) : (
            <ul className="divide-y">
              {tokens.map((t) => (
                <li key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-tradealo-text truncate">{t.name}</p>
                    <p className="text-xs text-tradealo-text-muted font-mono">
                      {t.prefix}…
                    </p>
                    <p className="text-xs text-tradealo-text-muted">
                      Último uso: {formatRelative(t.lastUsedAt)} · Creado{' '}
                      {new Date(t.createdAt).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={revoking === t.id}
                    onClick={() => handleRevoke(t.id, t.name)}
                    leftIcon={<Trash2 size={14} />}
                  >
                    Revocar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
