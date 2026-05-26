'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Swords } from 'lucide-react';
import { disputes } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/lib/store';

export default function NewDisputePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [respondentId, setRespondentId] = useState(searchParams.get('respondentId') ?? '');
  const [listingId, setListingId] = useState(searchParams.get('listingId') ?? '');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondentId.trim() || !subject.trim() || !description.trim()) {
      toast.error('Completá todos los campos obligatorios');
      return;
    }
    setSubmitting(true);
    try {
      const result = await disputes.create({
        respondentId: respondentId.trim(),
        listingId: listingId.trim() || undefined,
        subject: subject.trim(),
        description: description.trim(),
      });
      toast.success('Disputa iniciada. Un administrador se pondrá en contacto.');
      router.push(`/disputes/${result.id}`);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'No se pudo crear la disputa. Intentá de nuevo.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-tradealo-primary-light flex items-center justify-center text-tradealo-primary">
          <Swords size={20} />
        </div>
        <h1 className="font-heading text-2xl font-bold text-tradealo-text">
          Iniciar disputa
        </h1>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="ID del otro usuario *"
              placeholder="UUID del usuario con quien tenés el conflicto"
              value={respondentId}
              onChange={(e) => setRespondentId(e.target.value)}
            />
            <Input
              label="ID de la publicación (opcional)"
              placeholder="UUID de la publicación relacionada"
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
            />
            <Input
              label="Asunto *"
              placeholder="Resumen del conflicto"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-tradealo-text mb-1.5">
                Descripción detallada *
              </label>
              <textarea
                className="w-full rounded-lg border border-tradealo-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary resize-none"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describí detalladamente la situación, incluyendo fechas y hechos relevantes…"
              />
            </div>
            <p className="text-xs text-tradealo-text-muted">
              Un administrador revisará tu disputa y se comunicará con ambas partes para resolverla.
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
              <Button type="submit" fullWidth loading={submitting}>
                Enviar disputa
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
