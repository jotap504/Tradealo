'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, ImagePlus, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { disputes, type DisputeMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/lib/store';

const STATUS_LABEL: Record<string, string> = {
  open: 'Abierta',
  in_review: 'En revisión',
  resolved: 'Resuelta',
  closed: 'Cerrada',
};

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  open: 'warning',
  in_review: 'default',
  resolved: 'success',
  closed: 'default',
};

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: dispute, isLoading } = useQuery({
    queryKey: ['my-dispute', id],
    queryFn: () => disputes.get(id),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dispute?.messages?.length]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const { imageUrl } = await disputes.uploadImage(id, base64, file.type);
        setPendingImageUrl(imageUrl);
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('No se pudo subir la imagen.');
      setUploadingImage(false);
    }
    e.target.value = '';
  };

  const sendReply = async () => {
    if (!reply.trim() && !pendingImageUrl) return;
    setSending(true);
    try {
      await disputes.addMessage(id, reply.trim() || '📎 Imagen adjunta', pendingImageUrl ?? undefined);
      setReply('');
      setPendingImageUrl(null);
      queryClient.invalidateQueries({ queryKey: ['my-dispute', id] });
      queryClient.invalidateQueries({ queryKey: ['my-disputes'] });
    } catch {
      toast.error('No se pudo enviar el mensaje. Intentá de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    setClosing(true);
    try {
      await disputes.close(id);
      toast.success('Disputa cerrada.');
      setConfirmClose(false);
      queryClient.invalidateQueries({ queryKey: ['my-dispute', id] });
      queryClient.invalidateQueries({ queryKey: ['my-disputes'] });
    } catch {
      toast.error('No se pudo cerrar la disputa.');
    } finally {
      setClosing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendReply();
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <Skeleton variant="card" className="h-8 w-48" />
        <Skeleton variant="card" className="h-96" />
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 text-center">
        <p className="text-sm text-tradealo-text-muted">Disputa no encontrada.</p>
        <Link href="/disputes" className="text-sm text-tradealo-primary hover:underline mt-2 inline-block">
          Volver a disputas
        </Link>
      </div>
    );
  }

  const isActive = dispute.status === 'open' || dispute.status === 'in_review';

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/disputes"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-tradealo-text-muted mt-0.5 shrink-0"
          aria-label="Volver"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-xl font-bold text-tradealo-text truncate">
            {dispute.subject}
          </h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge variant={STATUS_VARIANT[dispute.status] ?? 'default'} size="sm">
              {STATUS_LABEL[dispute.status] ?? dispute.status}
            </Badge>
            <span className="text-xs text-tradealo-text-muted">
              <RelativeTime iso={dispute.createdAt} />
            </span>
          </div>
        </div>
        {isActive && (
          <button
            onClick={() => setConfirmClose(true)}
            className="shrink-0 text-xs text-red-500 hover:text-red-700 underline-offset-2 hover:underline transition-colors"
          >
            Cerrar disputa
          </button>
        )}
      </div>

      {/* Description */}
      <Card>
        <CardBody className="space-y-2">
          <p className="text-xs font-medium text-tradealo-text-muted uppercase tracking-wide">Descripción inicial</p>
          <p className="text-sm text-tradealo-text leading-relaxed">{dispute.description}</p>
        </CardBody>
      </Card>

      {/* Resolution (if resolved/closed) */}
      {dispute.resolution && (
        <Card>
          <CardBody className="space-y-2">
            <p className="text-xs font-medium text-tradealo-text-muted uppercase tracking-wide">Resolución</p>
            <p className="text-sm text-tradealo-text leading-relaxed">{dispute.resolution}</p>
          </CardBody>
        </Card>
      )}

      {/* Thread */}
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {!dispute.messages?.length ? (
              <p className="text-sm text-tradealo-text-muted text-center py-8">
                Sin mensajes aún. Podés agregar información o evidencia.
              </p>
            ) : (
              dispute.messages.map((msg: DisputeMessage) => {
                const isAdmin = msg.authorType === 'admin';
                const isMine = !isAdmin && msg.authorId === currentUser?.id;
                const alignRight = isAdmin || isMine;

                return (
                  <div key={msg.id} className={`flex ${alignRight ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm space-y-2 ${
                        isAdmin
                          ? 'bg-tradealo-primary text-white rounded-tr-none'
                          : isMine
                          ? 'bg-teal-50 border border-teal-200 text-tradealo-text rounded-tr-none'
                          : 'bg-gray-100 text-tradealo-text rounded-tl-none'
                      }`}
                    >
                      <p className={`text-xs font-medium opacity-75 ${isAdmin ? 'text-white' : 'text-tradealo-text-muted'}`}>
                        {isAdmin ? 'Soporte Trocalia' : isMine ? 'Vos' : 'Otra parte'}
                      </p>
                      {msg.message && msg.message !== '📎 Imagen adjunta' && (
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      )}
                      {msg.imageUrl && (
                        <div className="relative w-48 h-36 rounded-lg overflow-hidden">
                          <Image
                            src={msg.imageUrl}
                            alt="Imagen adjunta"
                            fill
                            className="object-cover cursor-pointer"
                            onClick={() => window.open(msg.imageUrl, '_blank')}
                          />
                        </div>
                      )}
                      <p className={`text-xs opacity-60 ${alignRight ? 'text-right' : ''}`}>
                        <RelativeTime iso={msg.createdAt} />
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {isActive ? (
            <div className="flex flex-col gap-2 pt-3 border-t border-tradealo-border">
              {pendingImageUrl && (
                <div className="relative inline-block w-24 h-20 rounded-lg overflow-hidden border border-tradealo-border">
                  <Image src={pendingImageUrl} alt="Previa" fill className="object-cover" />
                  <button
                    onClick={() => setPendingImageUrl(null)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                    aria-label="Quitar imagen"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="p-2.5 rounded-xl border border-tradealo-border text-tradealo-text-muted hover:bg-gray-50 transition-colors disabled:opacity-50"
                  aria-label="Adjuntar imagen"
                  title="Adjuntar imagen"
                >
                  <ImagePlus size={18} />
                </button>
                <textarea
                  className="flex-1 rounded-xl border border-tradealo-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tradealo-primary-light focus:border-tradealo-primary resize-none"
                  rows={2}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribí tu mensaje… (Ctrl+Enter para enviar)"
                />
                <Button
                  leftIcon={<Send size={14} />}
                  loading={sending}
                  onClick={sendReply}
                  disabled={!reply.trim() && !pendingImageUrl}
                  className="self-end"
                >
                  Enviar
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>
          ) : (
            <div className="pt-3 border-t border-tradealo-border text-center">
              <p className="text-xs text-tradealo-text-muted">
                Esta disputa está {dispute.status === 'resolved' ? 'resuelta' : 'cerrada'}.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Confirm close modal */}
      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Cerrar disputa"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-tradealo-text-muted">
            ¿Seguro que querés cerrar esta disputa? Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setConfirmClose(false)}>
              Cancelar
            </Button>
            <Button variant="danger" fullWidth loading={closing} onClick={handleClose}>
              Cerrar disputa
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
