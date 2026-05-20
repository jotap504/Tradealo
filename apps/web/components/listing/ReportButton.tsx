'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { reports } from '@/lib/api';
import { useAuthStore, toast } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

const REASONS: { value: string; label: string }[] = [
  { value: 'spam', label: 'Spam o publicidad no solicitada' },
  { value: 'fraud', label: 'Fraude o estafa' },
  { value: 'inappropriate', label: 'Contenido inapropiado' },
  { value: 'fake', label: 'Producto falso o engañoso' },
  { value: 'other', label: 'Otro' },
];

interface Props {
  targetType: 'listing' | 'user';
  targetId: string;
  ownerId?: string;
}

export function ReportButton({ targetType, targetId, ownerId }: Props) {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      reports.create({
        targetType,
        targetId,
        reason,
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Denuncia enviada. Gracias por ayudarnos a mantener la comunidad.');
      setOpen(false);
      setReason('');
      setDescription('');
    },
    onError: () => toast.error('No se pudo enviar la denuncia. Intentá de nuevo.'),
  });

  if (!user || user.id === ownerId) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-tradealo-text-muted hover:text-red-500 transition-colors"
      >
        <Flag size={13} />
        Denunciar
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={targetType === 'listing' ? 'Denunciar publicación' : 'Denunciar usuario'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-tradealo-text mb-1.5">
              Motivo *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-tradealo-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary/30 bg-white"
            >
              <option value="">Seleccioná un motivo</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-tradealo-text mb-1.5">
              Descripción{' '}
              <span className="text-tradealo-text-muted font-normal">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Contanos más detalles sobre el problema..."
              className="w-full rounded-lg border border-tradealo-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary/30 resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={mutation.isPending}
              disabled={!reason}
              onClick={() => mutation.mutate()}
            >
              Enviar denuncia
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
