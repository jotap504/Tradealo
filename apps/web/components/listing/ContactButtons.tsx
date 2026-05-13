'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Phone, Send, MessageCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { useAuthStore, toast } from '@/lib/store';
import { listings } from '@/lib/api';

const schema = z.object({
  message: z.string().min(10, 'Contanos un poco más (mínimo 10 caracteres)'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  listingId: string;
  showPhone?: boolean;
  phone?: string;
  sellerUsername?: string;
}

export function ContactButtons({ listingId, showPhone, phone, sellerUsername }: Props) {
  const currentUser = useAuthStore((s) => s.user);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await listings.contactSeller(listingId, values);
      toast.success('¡Tu consulta fue enviada!');
      setSent(true);
      reset();
    } catch {
      toast.error('No pudimos enviar tu consulta. Probá más tarde.');
    }
  };

  const waNumber = phone?.replace(/[^0-9]/g, '');
  const waLink =
    showPhone && waNumber
      ? `https://wa.me/${waNumber}?text=${encodeURIComponent(
          `Hola${sellerUsername ? ` ${sellerUsername}` : ''}, vi tu publicación en Tradealo y me interesa.`
        )}`
      : null;

  return (
    <Card>
      <CardBody className="space-y-3">
        {waLink && (
          <a href={waLink} target="_blank" rel="noreferrer" className="block">
            <Button
              variant="whatsapp"
              fullWidth
              size="lg"
              leftIcon={<Phone size={18} />}
            >
              Chatear por WhatsApp
            </Button>
          </a>
        )}

        {sent ? (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
            <MessageCircle
              size={24}
              className="mx-auto text-tradealo-success mb-2"
            />
            <p className="text-sm font-medium text-tradealo-success">
              Consulta enviada
            </p>
            <p className="text-xs text-tradealo-text-muted mt-1">
              El vendedor te responderá por email pronto.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-xs text-tradealo-primary hover:underline mt-3"
            >
              Enviar otra consulta
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <p className="text-sm font-medium text-tradealo-text">
              Enviar consulta
            </p>
            {currentUser && (
              <div className="flex items-center gap-2 text-xs text-tradealo-text-muted bg-tradealo-bg rounded-lg px-3 py-2">
                <User size={14} />
                <span>
                  {currentUser.username ?? currentUser.email}
                </span>
              </div>
            )}
            <Textarea
              placeholder="Hola, me interesa, ¿sigue disponible? ¿Aceptás trueque?"
              rows={4}
              {...register('message')}
              error={errors.message?.message}
            />
            <Button
              type="submit"
              fullWidth
              loading={isSubmitting}
              leftIcon={<Send size={16} />}
            >
              Enviar consulta
            </Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
