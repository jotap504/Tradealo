'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, MessageCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listings } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { toast } from '@/lib/store';
import type { PendingQuestion } from '@/types';

export default function PendingQuestionsPage() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['my-shop', 'pending-questions'],
    queryFn: () => listings.getPendingQuestions(),
    staleTime: 30_000,
  });

  // Group by listing so multiple unanswered Q&As on the same listing collapse.
  const grouped = useMemo(() => {
    const map = new Map<string, { title: string; items: PendingQuestion[] }>();
    for (const q of rows) {
      const entry = map.get(q.listingId) ?? { title: q.listingTitle, items: [] };
      entry.items.push(q);
      map.set(q.listingId, entry);
    }
    return Array.from(map, ([listingId, v]) => ({ listingId, ...v }));
  }, [rows]);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/my-shop"
          className="p-2 rounded-lg hover:bg-gray-100 text-tradealo-text-muted shrink-0"
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-tradealo-text">
            Preguntas por responder
          </h1>
          <p className="text-sm text-tradealo-text-muted">
            Las preguntas pendientes en todas tus publicaciones.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-tradealo-text-muted">Cargando…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center space-y-2">
            <MessageCircle
              size={32}
              className="mx-auto text-tradealo-text-muted opacity-40"
            />
            <p className="text-sm text-tradealo-text-muted">
              No tenés preguntas pendientes. Volvé cuando alguien te pregunte
              algo en alguna de tus publicaciones.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <Card key={group.listingId}>
              <CardBody className="space-y-3">
                <Link
                  href={`/listing/${group.listingId}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-tradealo-primary hover:underline"
                >
                  {group.title}
                  <ExternalLink size={12} />
                </Link>
                <div className="space-y-2">
                  {group.items.map((q) => (
                    <PendingQuestionItem
                      key={q.id}
                      q={q}
                      onAnswered={() =>
                        qc.invalidateQueries({
                          queryKey: ['my-shop', 'pending-questions'],
                        })
                      }
                    />
                  ))}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PendingQuestionItem({
  q,
  onAnswered,
}: {
  q: PendingQuestion;
  onAnswered: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (answer.trim().length < 2) {
      toast.error('Escribí una respuesta');
      return;
    }
    setSending(true);
    try {
      await listings.answerQuestion(q.listingId, q.id, answer.trim());
      toast.success('Respuesta publicada');
      setOpen(false);
      setAnswer('');
      onAnswered();
    } catch {
      toast.error('No se pudo publicar la respuesta');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-tradealo-border p-3">
      <p className="text-sm text-tradealo-text break-words">{q.question}</p>
      <p className="text-[10px] text-tradealo-text-muted mt-0.5">
        <span className="font-medium">
          {q.askerUsername ? `@${q.askerUsername}` : 'Anónimo'}
        </span>
        {' · '}
        <RelativeTime iso={q.createdAt} />
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 text-xs text-tradealo-primary font-medium hover:underline"
        >
          Responder
        </button>
      ) : (
        <div className="mt-2 space-y-2">
          <Textarea
            placeholder="Escribí tu respuesta…"
            rows={3}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSend} loading={sending}>
              Publicar respuesta
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setAnswer('');
              }}
              disabled={sending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
