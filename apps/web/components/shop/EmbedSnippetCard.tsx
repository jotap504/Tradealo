'use client';
import { useState } from 'react';
import { Code2, Copy, Check } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { APP_URL } from '@/lib/constants';

interface Props {
  username: string;
}

export function EmbedSnippetCard({ username }: Props) {
  const [copied, setCopied] = useState(false);
  const base = APP_URL.replace(/\/$/, '');
  const snippet = `<iframe
  src="${base}/embed/${username}"
  width="100%"
  height="520"
  style="border:none;border-radius:12px;"
  loading="lazy"
></iframe>`;

  const copy = () => {
    void navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Code2 size={14} className="text-tradealo-primary" />
          <p className="font-heading font-semibold text-sm">
            Widget para incrustar en tu sitio
          </p>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-tradealo-text-muted">
          Pegá este código en tu blog, WordPress, Wix, Webflow o cualquier
          página. Muestra tus 6 productos destacados con link directo a tu
          tienda.
        </p>
        <div className="relative">
          <pre className="text-xs font-mono p-3 rounded-lg bg-gray-900 text-gray-100 overflow-x-auto whitespace-pre">
{snippet}
          </pre>
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-2 right-2"
            onClick={copy}
            leftIcon={copied ? <Check size={13} /> : <Copy size={13} />}
          >
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
        <a
          href={`/embed/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-tradealo-primary hover:underline"
        >
          Previsualizar widget →
        </a>
      </CardBody>
    </Card>
  );
}
