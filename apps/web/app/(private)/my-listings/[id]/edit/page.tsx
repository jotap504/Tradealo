'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { ProvinceSelector } from '@/components/ui/ProvinceSelector';
import { ImageUploader } from '@/components/listing/ImageUploader';
import { AIGeneratorButton } from '@/components/listing/AIGeneratorButton';
import { PurchaseModal } from '@/components/wallet/PurchaseModal';
import { TokenBadge } from '@/components/wallet/TokenBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { listings, wallet } from '@/lib/api';
import { toast } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  CONDITIONS,
  PAYMENT_METHODS,
  SHIPPING_OPTIONS,
  LISTING_DURATION_PRESETS,
  LISTING_DURATION_MIN,
  LISTING_DURATION_MAX,
  getDurationMultiplier,
  LISTING_BASE_COST,
} from '@/lib/constants';
import type { TokenPack } from '@/types';

interface FormData {
  title: string;
  description: string;
  condition: import('@/types').ListingCondition;
  attributes: Record<string, unknown>;
  price: string;
  currency: 'ARS' | 'USD';
  negotiable: boolean;
  paymentMethods: string[];
  shippingOptions: string[];
  shippingDescription: string;
  province: string;
  city: string;
  type: 'standard' | 'premium';
  durationDays: number;
}

const TOTAL_STEPS = 5;

function StepIndicator({ current, total }: { current: number; total: number }) {
  const labels = ['Info', 'Fotos', 'Precio', 'Ubicación', 'Tipo'];
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => {
        const s = i + 1;
        const done = s < current;
        const active = s === current;
        return (
          <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                  done
                    ? 'bg-tradealo-success text-white'
                    : active
                    ? 'bg-tradealo-primary text-white'
                    : 'bg-gray-200 text-gray-500'
                )}
              >
                {done ? <Check size={12} strokeWidth={3} /> : s}
              </div>
              <span className="text-[10px] text-tradealo-text-muted hidden sm:block">
                {labels[i]}
              </span>
            </div>
            {s < total && (
              <div
                className={cn(
                  'flex-1 h-1 rounded-full mb-4',
                  done ? 'bg-tradealo-primary' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState<TokenPack | null>(null);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listings.getListing(id),
    staleTime: 60_000,
  });

  const { data: balanceData } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => wallet.getBalance(),
    staleTime: 60_000,
  });

  const { data: packs } = useQuery({
    queryKey: ['token-packs'],
    queryFn: () => wallet.getPacks(),
    staleTime: 300_000,
    enabled: step === TOTAL_STEPS,
  });

  useEffect(() => {
    if (listing && !formData) {
      setFormData({
        title: listing.title,
        description: listing.description,
        condition: listing.condition,
        attributes: (listing.attributes as Record<string, unknown>) ?? {},
        price: String(listing.price),
        currency: listing.currency,
        negotiable: listing.negotiable,
        paymentMethods: listing.paymentMethods ?? [],
        shippingOptions: listing.shippingOptions ?? [],
        shippingDescription: listing.shippingDescription ?? '',
        province: listing.province ?? '',
        city: listing.city ?? '',
        type: listing.type ?? 'standard',
        durationDays: 30,
      });
    }
  }, [listing, formData]);

  const update = (patch: Partial<FormData>) =>
    setFormData((prev) => (prev ? { ...prev, ...patch } : prev));

  if (isLoading || !formData) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-4">
        <Skeleton variant="text" className="w-1/3 h-8" />
        <Skeleton variant="card" className="h-96" />
      </div>
    );
  }

  const multiplier = getDurationMultiplier(formData.durationDays);
  const totalCost = Math.ceil(LISTING_BASE_COST[formData.type] * multiplier);
  const canAfford =
    (balanceData?.balance ?? 0) >= totalCost || formData.type === 'standard';

  const goNext = async () => {
    if (step === 3 && (!formData.price || isNaN(Number(formData.price)))) {
      toast.error('Ingresá un precio válido');
      return;
    }
    if (step === 4 && !formData.province) {
      toast.error('Seleccioná una provincia');
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSave = async () => {
    setSaving(true);
    try {
      await listings.updateListing(id, {
        title: formData.title,
        description: formData.description,
        condition: formData.condition,
        attributes: formData.attributes,
        price: Number(formData.price),
        currency: formData.currency,
        negotiable: formData.negotiable,
        paymentMethods: formData.paymentMethods,
        shippingOptions: formData.shippingOptions,
        shippingDescription: formData.shippingDescription,
        province: formData.province,
        city: formData.city,
      });
      toast.success('Publicación actualizada');
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      router.push('/my-listings');
    } catch {
      toast.error('No se pudo actualizar la publicación');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <h1 className="font-heading text-2xl font-bold text-tradealo-text mb-6">
        Editar publicación
      </h1>

      <StepIndicator current={step} total={TOTAL_STEPS} />

      <Card>
        <CardBody className="p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-heading font-semibold text-lg">
                Información del producto
              </h2>
              <div className="space-y-1">
                <Input
                  label="Título"
                  value={formData.title}
                  onChange={(e) => update({ title: e.target.value })}
                />
                <AIGeneratorButton
                  type="title"
                  context={{ title: formData.title }}
                  onGenerate={(text) => update({ title: text })}
                />
              </div>
              <div className="space-y-1">
                <Textarea
                  label="Descripción"
                  rows={5}
                  value={formData.description}
                  onChange={(e) => update({ description: e.target.value })}
                />
                <AIGeneratorButton
                  type="description"
                  context={{ title: formData.title }}
                  onGenerate={(text) => update({ description: text })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-tradealo-text mb-2">
                  Estado
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CONDITIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => update({ condition: c.value })}
                      className={cn(
                        'py-3 rounded-xl border text-sm font-medium transition-all',
                        formData.condition === c.value
                          ? 'border-tradealo-primary bg-tradealo-primary-light text-tradealo-primary-hover'
                          : 'border-tradealo-border bg-white hover:border-tradealo-primary/40'
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-heading font-semibold text-lg">Fotos</h2>
              <ImageUploader
                listingId={id}
                initialImages={listing?.images ?? []}
                maxImages={8}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-heading font-semibold text-lg">
                Precio y contacto
              </h2>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    label="Precio"
                    type="number"
                    value={formData.price}
                    onChange={(e) => update({ price: e.target.value })}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-tradealo-text mb-1.5">
                    Moneda
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) =>
                      update({ currency: e.target.value as 'ARS' | 'USD' })
                    }
                    className="h-11 rounded-lg border border-tradealo-border px-3 text-sm focus:outline-none focus:border-tradealo-primary"
                  >
                    <option value="ARS">ARS $</option>
                    <option value="USD">USD U$S</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.negotiable}
                  onChange={(e) => update({ negotiable: e.target.checked })}
                  className="w-4 h-4 rounded text-tradealo-primary"
                />
                <span className="text-sm font-medium">Precio negociable</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-tradealo-text mb-2">
                  Métodos de pago
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <label key={m} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.paymentMethods.includes(m)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...formData.paymentMethods, m]
                            : formData.paymentMethods.filter((p) => p !== m);
                          update({ paymentMethods: next });
                        }}
                        className="w-4 h-4 rounded text-tradealo-primary"
                      />
                      <span className="text-sm">{m}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-tradealo-text mb-2">
                  Opciones de envío
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SHIPPING_OPTIONS.map((s) => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.shippingOptions.includes(s)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...formData.shippingOptions, s]
                            : formData.shippingOptions.filter((o) => o !== s);
                          update({ shippingOptions: next });
                        }}
                        className="w-4 h-4 rounded text-tradealo-primary"
                      />
                      <span className="text-sm">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="font-heading font-semibold text-lg">Ubicación</h2>
              <ProvinceSelector
                label="Provincia"
                value={formData.province}
                onChange={(e) => update({ province: e.target.value })}
              />
              <Input
                label="Ciudad"
                value={formData.city}
                onChange={(e) => update({ city: e.target.value })}
              />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <h2 className="font-heading font-semibold text-lg">
                Tipo y duración
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(['standard', 'premium'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update({ type: t })}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left transition-all',
                      formData.type === t
                        ? 'border-tradealo-primary bg-tradealo-primary-light'
                        : 'border-tradealo-border bg-white hover:border-tradealo-primary/40'
                    )}
                  >
                    <p className="font-heading font-semibold capitalize">{t}</p>
                    <p className="text-xs text-tradealo-text-muted mt-1">
                      {t === 'standard' ? 'Gratis con cuota mensual' : 'Requiere tokens'}
                    </p>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {LISTING_DURATION_PRESETS.map((d) => (
                  <button
                    key={d.days}
                    type="button"
                    onClick={() => update({ durationDays: d.days })}
                    className={cn(
                      'py-3 rounded-xl border text-sm font-medium transition-all',
                      formData.durationDays === d.days
                        ? 'border-tradealo-primary bg-tradealo-primary-light'
                        : 'border-tradealo-border bg-white'
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-tradealo-text-muted">Personalizado:</label>
                <input
                  type="number"
                  min={LISTING_DURATION_MIN}
                  max={LISTING_DURATION_MAX}
                  value={formData.durationDays}
                  onChange={(e) => {
                    const raw = Number(e.target.value);
                    const v = isNaN(raw) || raw < LISTING_DURATION_MIN
                      ? LISTING_DURATION_MIN
                      : Math.min(LISTING_DURATION_MAX, raw);
                    update({ durationDays: v });
                  }}
                  className="w-24 h-10 rounded-lg border border-tradealo-border px-3 text-sm text-center focus:outline-none focus:border-tradealo-primary"
                />
                <span className="text-sm text-tradealo-text-muted">días (1-90)</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-tradealo-border">
                <div className="flex items-center justify-between font-semibold text-sm">
                  <span>Costo estimado</span>
                  <TokenBadge tokens={totalCost} size="sm" />
                </div>
                <div className="flex items-center justify-between text-xs text-tradealo-text-muted">
                  <span>Tu balance</span>
                  <span>{balanceData?.balance ?? 0} tokens</span>
                </div>
                {!canAfford && (
                  <p className="text-xs text-tradealo-error">
                    No tenés suficientes tokens.{' '}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        const cheap = packs?.sort((a, b) => a.priceArs - b.priceArs)[0];
                        if (cheap) {
                          setSelectedPack(cheap);
                          setPurchaseModal(true);
                        }
                      }}
                    >
                      Comprá tokens
                    </button>
                  </p>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={step === 1}
          leftIcon={<ChevronLeft size={16} />}
        >
          Anterior
        </Button>
        {step < TOTAL_STEPS ? (
          <Button onClick={goNext} rightIcon={<ChevronRight size={16} />}>
            Siguiente
          </Button>
        ) : (
          <Button onClick={handleSave} loading={saving} disabled={!canAfford}>
            Guardar cambios
          </Button>
        )}
      </div>

      <PurchaseModal
        open={purchaseModal}
        pack={selectedPack}
        onClose={() => setPurchaseModal(false)}
      />
    </div>
  );
}
