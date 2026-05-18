'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orders, reviews } from '@/lib/api';
import { useAuthStore, toast } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';

interface Props {
  conversationId: string;
}

export function OrderActions({ conversationId }: Props) {
  const currentUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', conversationId],
    queryFn: () => orders.getByConversation(conversationId),
    retry: false,
  });

  const isSeller = order && currentUser && order.sellerId === currentUser.id;
  const isBuyer = order && currentUser && order.buyerId === currentUser.id;

  const deliverMutation = useMutation({
    mutationFn: () => orders.markDelivered(order!.id),
    onSuccess: () => {
      toast.success('Producto marcado como entregado');
      qc.invalidateQueries({ queryKey: ['order', conversationId] });
    },
    onError: () => toast.error('No se pudo marcar como entregado'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => orders.cancel(order!.id),
    onSuccess: () => {
      toast.success('Venta cancelada');
      qc.invalidateQueries({ queryKey: ['order', conversationId] });
    },
    onError: () => toast.error('No se pudo cancelar la venta'),
  });

  const sendPaymentMutation = useMutation({
    mutationFn: () => orders.sendPaymentInfo(order!.id),
    onSuccess: () => {
      toast.success('Datos de pago enviados');
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudieron enviar los datos';
      toast.error(msg);
    },
  });

  const sendContactMutation = useMutation({
    mutationFn: () => orders.sendContact(order!.id),
    onSuccess: () => {
      toast.success('Datos de contacto enviados');
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudieron enviar los datos';
      toast.error(msg);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () => {
      const direction = isBuyer ? 'buyer_to_seller' : 'seller_to_buyer';
      const reviewedId = isBuyer ? order!.sellerId : order!.buyerId;
      return reviews.createReview({
        reviewedId,
        listingId: order!.listingId,
        direction,
        overallRating: rating,
        comment: comment.trim() || undefined,
      });
    },
    onSuccess: async () => {
      if (isBuyer) {
        await orders.complete(order!.id);
      }
      toast.success('¡Gracias por calificar!');
      setShowReviewForm(false);
      setRating(0);
      setComment('');
      qc.invalidateQueries({ queryKey: ['order', conversationId] });
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error('Ya calificaste esta operación');
      } else {
        toast.error('No se pudo enviar la calificación');
      }
    },
  });

  if (isLoading || !order) return null;

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
    delivered: { label: 'Entregado', color: 'bg-blue-100 text-blue-800' },
    completed: { label: 'Completado', color: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
  };
  const statusInfo = statusLabels[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-800' };

  return (
    <div className="mb-4 rounded-xl border border-tradealo-border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-tradealo-text">
          Orden de compra
        </span>
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Seller actions */}
      {isSeller && order.status === 'pending' && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            loading={sendContactMutation.isPending}
            onClick={() => sendContactMutation.mutate()}
          >
            Enviar datos de contacto
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={sendPaymentMutation.isPending}
            onClick={() => sendPaymentMutation.mutate()}
          >
            Enviar datos de pago
          </Button>
          <Button
            size="sm"
            variant="primary"
            loading={deliverMutation.isPending}
            onClick={() => deliverMutation.mutate()}
          >
            Producto entregado/enviado
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={cancelMutation.isPending}
            onClick={() => {
              if (confirm('¿Cancelar la venta? Se restituirá el stock.')) {
                cancelMutation.mutate();
              }
            }}
          >
            Cancelar venta
          </Button>
        </div>
      )}

      {/* Buyer: review CTA (delivered) */}
      {isBuyer && order.status === 'delivered' && !showReviewForm && (
        <div className="text-sm text-tradealo-text">
          <p className="mb-2">El vendedor marcó el producto como entregado.</p>
          <Button size="sm" onClick={() => setShowReviewForm(true)}>
            Calificar vendedor
          </Button>
        </div>
      )}

      {/* Seller: review CTA (delivered or completed) */}
      {isSeller &&
        (order.status === 'delivered' || order.status === 'completed') &&
        !showReviewForm && (
          <div className="text-sm text-tradealo-text">
            <p className="mb-2">
              {order.status === 'delivered'
                ? 'Marcaste el producto como entregado. Calificá al comprador para cerrar la operación.'
                : 'La operación fue completada. Podés calificar al comprador.'}
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowReviewForm(true)}
            >
              Calificar comprador
            </Button>
          </div>
        )}

      {/* Shared review form (buyer or seller) */}
      {showReviewForm && (isBuyer || isSeller) && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-tradealo-text">
            {isBuyer
              ? 'Calificá tu experiencia con el vendedor'
              : 'Calificá tu experiencia con el comprador'}
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="text-2xl transition-colors"
              >
                <span className={star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-300'}>
                  ★
                </span>
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Dejá un comentario (opcional)"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              loading={reviewMutation.isPending}
              disabled={rating === 0}
              onClick={() => reviewMutation.mutate()}
            >
              Enviar calificación
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowReviewForm(false);
                setRating(0);
                setComment('');
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Status info for completed/cancelled */}
      {order.status === 'completed' && !showReviewForm && !(isSeller) && (
        <p className="text-xs text-tradealo-text-muted">
          Operación completada.
        </p>
      )}
      {order.status === 'cancelled' && (
        <p className="text-xs text-tradealo-text-muted">
          Esta venta fue cancelada.
        </p>
      )}
    </div>
  );
}
