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
} from 'lucide-react';
import { apiTokens, type ApiTokenSummary, type CreatedApiToken } from '@/lib/api';
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

  useEffect(() => {
    apiTokens.list().then(setTokens).catch(() => setTokens([]));
  }, []);

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
