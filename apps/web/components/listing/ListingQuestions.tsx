'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { listings } from '@/lib/api';
import { useAuthStore, toast } from '@/lib/store';
import { RelativeTime } from '@/components/ui/RelativeTime';
import type { ListingQuestion } from '@/types';

const PREVIEW_COUNT = 3;

interface Props {
  listingId: string;
  sellerId: string;
}

export function ListingQuestions({ listingId, sellerId }: Props) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.id === sellerId;
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [showAll, setShowAll] = useState(false);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['listing-questions', listingId],
    queryFn: () => listings.getQuestions(listingId),
    staleTime: 30_000,
  });

  const visibleQuestions = useMemo<ListingQuestion[]>(() => {
    if (showAll || questions.length <= PREVIEW_COUNT) return questions;
    return questions.slice(0, PREVIEW_COUNT);
  }, [questions, showAll]);

  const hiddenCount = questions.length - PREVIEW_COUNT;

  const handleAsk = async () => {
    if (!question.trim() || question.trim().length < 10) {
      toast.error('La pregunta debe tener al menos 10 caracteres');
      return;
    }
    setSending(true);
    try {
      await listings.askQuestion(listingId, question.trim());
      toast.success('Pregunta enviada');
      setQuestion('');
      queryClient.invalidateQueries({ queryKey: ['listing-questions', listingId] });
    } catch {
      toast.error('No se pudo enviar la pregunta');
    } finally {
      setSending(false);
    }
  };

  const handleAnswer = async (questionId: string) => {
    if (!answerText.trim()) {
      toast.error('Escribí una respuesta');
      return;
    }
    setSending(true);
    try {
      await listings.answerQuestion(listingId, questionId, answerText.trim());
      toast.success('Respuesta publicada');
      setAnswerText('');
      setAnsweringId(null);
      queryClient.invalidateQueries({ queryKey: ['listing-questions', listingId] });
    } catch {
      toast.error('No se pudo publicar la respuesta');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-tradealo-border pt-6 mt-6">
      <div className="flex items-center gap-2">
        <MessageCircle size={18} className="text-tradealo-primary" />
        <h2 className="font-heading font-semibold text-lg flex-1">
          Preguntas y respuestas
          {questions.length > 0 && (
            <span className="ml-2 text-sm text-tradealo-text-muted font-normal">
              ({questions.length})
            </span>
          )}
        </h2>
      </div>

      <div className="mt-4 space-y-4">
        {isLoading ? (
          <p className="text-sm text-tradealo-text-muted">Cargando preguntas…</p>
        ) : questions.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <p className="text-sm text-tradealo-text-muted">
              Todavía no hay preguntas. Sé el primero en preguntar.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {visibleQuestions.map((q) => (
                <div
                  key={q.id}
                  className="bg-white rounded-xl border border-tradealo-border p-4 space-y-2"
                >
                  <div>
                    <p className="text-sm font-medium text-tradealo-text">{q.question}</p>
                    <p className="text-[10px] text-tradealo-text-muted mt-0.5">
                      <RelativeTime iso={q.createdAt} />
                    </p>
                  </div>
                  {q.answer ? (
                    <div className="ml-4 pl-3 border-l-2 border-tradealo-primary bg-tradealo-primary-light/30 rounded-r-lg p-3">
                      <p className="text-sm text-tradealo-text">{q.answer}</p>
                      {q.answeredAt && (
                        <p className="text-[10px] text-tradealo-text-muted mt-0.5">
                          Respondido <RelativeTime iso={q.answeredAt} />
                        </p>
                      )}
                    </div>
                  ) : isOwner && answeringId !== q.id ? (
                    <button
                      type="button"
                      onClick={() => setAnsweringId(q.id)}
                      className="text-xs text-tradealo-primary font-medium hover:underline"
                    >
                      Responder
                    </button>
                  ) : null}
                  {answeringId === q.id && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Escribí tu respuesta…"
                        rows={3}
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAnswer(q.id)}
                          loading={sending}
                        >
                          Publicar respuesta
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAnsweringId(null);
                            setAnswerText('');
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-sm font-medium text-tradealo-primary hover:underline"
              >
                {showAll ? 'Ver menos' : `Ver todas las preguntas (${hiddenCount} más)`}
              </button>
            )}
          </>
        )}

        {!isOwner && (
          <div className="space-y-2 pt-2">
            <Textarea
              placeholder="Hacé tu pregunta sobre este producto…"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              showCount
              minLength={10}
              maxLength={500}
            />
            <Button onClick={handleAsk} loading={sending}>
              Preguntar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
