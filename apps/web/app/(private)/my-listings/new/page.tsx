'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { ProvinceSelector } from '@/components/ui/ProvinceSelector';
import { CategorySelector } from '@/components/listing/CategorySelector';
import { ImageUploader } from '@/components/listing/ImageUploader';
import { AIGeneratorButton } from '@/components/listing/AIGeneratorButton';
import { PurchaseModal } from '@/components/wallet/PurchaseModal';
import { TokenBadge } from '@/components/wallet/TokenBadge';
import { listings, wallet, categories as categoriesApi } from '@/lib/api';
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
import type { Category, TokenPack, SaleType } from '@/types';

function extractYoutubeId(input: string): string | null {
  if (!input) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /^([\w-]{11})$/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return null;
}

interface FormData {
  categoryId: string;
  isCollectible: boolean;
  categoryAttributes?: Category['attributes'];
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
  saleType: SaleType;
  stock: string;
  desiredPrice: string;
  contactPhone: string;
  showWhatsApp: boolean;
  youtubeLiveId: string;
}

const EMPTY_FORM: FormData = {
  categoryId: '',
  isCollectible: false,
  categoryAttributes: undefined,
  title: '',
  description: '',
  condition: 'used',
  attributes: {},
  price: '',
  currency: 'ARS',
  negotiable: false,
  paymentMethods: [],
  shippingOptions: [],
  shippingDescription: '',
  province: '',
  city: '',
  type: 'standard',
  durationDays: 30,
  saleType: 'contact',
  stock: '',
  desiredPrice: '',
  contactPhone: '',
  showWhatsApp: false,
  youtubeLiveId: '',
};

const TOTAL_STEPS = 7;

function StepIndicator({ current, total }: { current: number; total: number }) {
  const labels = ['Categoría', 'Tipo', 'Detalles', 'Fotos', 'Precio', 'Ubicación', 'Tipo'];
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center gap-2 flex-1 last:flex-none">
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
                {done ? <Check size={12} strokeWidth={3} /> : step}
              </div>
              <span className="text-[10px] text-tradealo-text-muted hidden sm:block">
                {labels[i]}
              </span>
            </div>
            {step < total && (
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

export default function NewListingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [flowType, setFlowType] = useState<'traditional' | 'live' | null>(null);
  const [listingId, setListingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState<TokenPack | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const maxStep = flowType === 'live' ? 3 : TOTAL_STEPS;

  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  const { data: balanceData } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => wallet.getBalance(),
    staleTime: 60_000,
  });

  const { data: packs } = useQuery({
    queryKey: ['token-packs'],
    queryFn: () => wallet.getPacks(),
    staleTime: 300_000,
    enabled: step === TOTAL_STEPS && flowType === 'traditional',
  });

  const { data: selectedCategory } = useQuery({
    queryKey: ['category', formData.categoryId],
    queryFn: () => categoriesApi.getCategory(formData.categoryId),
    enabled: !!formData.categoryId,
    staleTime: 300_000,
  });

  const update = (patch: Partial<FormData>) =>
    setFormData((prev) => ({ ...prev, ...patch }));

  const baseCost = LISTING_BASE_COST[formData.type];
  const multiplier = getDurationMultiplier(formData.durationDays);
  const totalCost = Math.ceil(baseCost * multiplier);
  const canAfford = (balanceData?.balance ?? 0) >= totalCost || formData.type === 'standard';

  const buildPayload = () => ({
    categoryId: formData.categoryId,
    type: formData.type,
    title: formData.title,
    description: formData.description,
    condition: formData.condition,
    collectibleAttributes: Object.keys(formData.attributes).length > 0 ? formData.attributes : undefined,
    price: Number(formData.price),
    currency: formData.currency,
    priceNegotiable: formData.negotiable,
    saleType: formData.saleType,
    stock: formData.stock ? Number(formData.stock) : undefined,
    desiredPrice: formData.desiredPrice ? Number(formData.desiredPrice) : undefined,
    paymentMethods: formData.paymentMethods,
    shippingOptions: formData.shippingOptions,
    shippingDescription: formData.shippingDescription || undefined,
    province: formData.province || undefined,
    city: formData.city || undefined,
    contactInfo: formData.contactPhone
      ? { phone: formData.contactPhone, showWhatsApp: formData.showWhatsApp }
      : undefined,
    youtubeLiveId: extractYoutubeId(formData.youtubeLiveId) || undefined,
  });

  const goNext = async () => {
    if (step === 1 && !formData.categoryId) {
      toast.error('Seleccioná una categoría');
      return;
    }
    if (step === 2) {
      if (!flowType) {
        toast.error('Seleccioná un tipo de publicación');
        return;
      }
      if (flowType === 'live') {
        update({
          title: `En Vivo - ${selectedCategory?.name ?? formData.categoryId}`,
          description: 'Publicación generada automáticamente para venta en vivo por YouTube. El vendedor se encuentra transmitiendo en este momento.',
          price: '0',
          saleType: 'live',
          type: 'standard',
          durationDays: 30,
        });
        setStep(3);
        return;
      }
    }
    if (step === 3 && flowType !== 'live') {
      if (!formData.title.trim() || formData.title.trim().length < 5) {
        toast.error('El título debe tener al menos 5 caracteres');
        return;
      }
      if (!formData.description.trim() || formData.description.trim().length < 20) {
        toast.error('La descripción debe tener al menos 20 caracteres');
        return;
      }
      if (!listingId) {
        setSaving(true);
        try {
          const created = await listings.createListing(buildPayload());
          setListingId(created.id);
        } catch {
          toast.error('No se pudo guardar el borrador');
          setSaving(false);
          return;
        }
        setSaving(false);
      }
    }
    if (step === 5 && (!formData.price || isNaN(Number(formData.price)))) {
      toast.error('Ingresá un precio válido');
      return;
    }
    if (step === 6 && !formData.province) {
      toast.error('Seleccioná una provincia');
      return;
    }
    setStep((s) => Math.min(s + 1, maxStep));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleCreateLive = async () => {
    const youtubeId = extractYoutubeId(formData.youtubeLiveId);
    if (!youtubeId) {
      toast.error('Ingresá un link válido de YouTube');
      return;
    }
    setSaving(true);
    try {
      const created = await listings.createListing(buildPayload());
      await listings.publishListing(created.id, {
        type: 'standard',
        durationDays: 30,
      });
      toast.success('¡Publicación en vivo creada!');
      router.push('/my-listings');
    } catch {
      toast.error('No se pudo crear la publicación en vivo');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!listingId) return;
    if (!canAfford) {
      toast.error('No tenés suficientes tokens');
      return;
    }
    setSaving(true);
    try {
      await listings.updateListing(listingId, buildPayload());
      await listings.publishListing(listingId, {
        type: formData.type,
        durationDays: formData.durationDays,
      });
      toast.success('¡Publicación enviada a revisión!');
      router.push('/my-listings');
    } catch {
      toast.error('No se pudo publicar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8" ref={formRef}>
      <h1 className="font-heading text-2xl font-bold text-tradealo-text mb-6">
        Nueva publicación
      </h1>

      <StepIndicator current={step} total={TOTAL_STEPS} />

      <Card>
        <CardBody className="p-6 space-y-6">
          {/* STEP 1 — Category */}
          {step === 1 && (
            <div>
              <h2 className="font-heading font-semibold text-lg mb-4">
                Paso 1: Elegí una categoría
              </h2>
              <CategorySelector
                value={formData.categoryId}
                onChange={(catId, isCollectible, attrs) =>
                  update({ categoryId: catId, isCollectible, categoryAttributes: attrs })
                }
              />
            </div>
          )}

          {/* STEP 2 — Tipo de publicación */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-heading font-semibold text-lg">
                Paso 2: Tipo de publicación
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setFlowType('traditional');
                    update({ saleType: 'contact' });
                  }}
                  className={cn(
                    'p-6 rounded-xl border-2 text-left transition-all',
                    flowType === 'traditional'
                      ? 'border-tradealo-primary bg-tradealo-primary-light'
                      : 'border-tradealo-border bg-white hover:border-tradealo-primary/40'
                  )}
                >
                  <h3 className="font-heading font-semibold text-lg mb-2">
                    Venta Tradicional
                  </h3>
                  <p className="text-sm text-tradealo-text-muted leading-relaxed">
                    Completá el formulario completo con fotos, precio, ubicación
                    y más. Ideal para vender productos con todos los detalles.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFlowType('live');
                    update({ saleType: 'live' });
                  }}
                  className={cn(
                    'p-6 rounded-xl border-2 text-left transition-all',
                    flowType === 'live'
                      ? 'border-tradealo-primary bg-tradealo-primary-light'
                      : 'border-tradealo-border bg-white hover:border-tradealo-primary/40'
                  )}
                >
                  <h3 className="font-heading font-semibold text-lg mb-2">
                    Venta en Vivo
                  </h3>
                  <p className="text-sm text-tradealo-text-muted leading-relaxed">
                    Creamos la publicación automáticamente. Solo necesitás el
                    link de tu transmisión de YouTube. Consume 1 token.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Live branch */}
          {step === 3 && flowType === 'live' && (
            <div className="space-y-5">
              <h2 className="font-heading font-semibold text-lg">
                Link de tu transmisión
              </h2>
              <Input
                label="Link o ID de YouTube"
                placeholder="Ej: https://youtube.com/watch?v=dQw4w9WgXcQ"
                value={formData.youtubeLiveId}
                onChange={(e) => update({ youtubeLiveId: e.target.value })}
                helper="Pegá el link de tu transmisión en vivo de YouTube."
              />
              {formData.youtubeLiveId && extractYoutubeId(formData.youtubeLiveId) && (
                <div className="mt-2 aspect-video rounded-lg overflow-hidden bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYoutubeId(formData.youtubeLiveId)}?rel=0`}
                    className="w-full h-full"
                    allow="encrypted-media"
                    allowFullScreen
                    title="Vista previa del video"
                  />
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-tradealo-border">
                <div className="flex items-center justify-between font-semibold text-sm">
                  <span>Costo</span>
                  <span className="text-tradealo-primary">1 token</span>
                </div>
                <p className="text-xs text-tradealo-text-muted">
                  La publicación se crea automáticamente con datos básicos y se
                  publica de inmediato por 30 días. El título será &ldquo;En
                  Vivo - {selectedCategory?.name ?? '...'}&rdquo;.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3 — Traditional: Product info */}
          {step === 3 && flowType !== 'live' && (
            <div className="space-y-5">
              <h2 className="font-heading font-semibold text-lg">
                Paso 3: Información del producto
              </h2>
              <div className="space-y-1">
                <Input
                  label="Título"
                  placeholder="Ej: Bicicleta rodado 26 en buen estado"
                  value={formData.title}
                  onChange={(e) => update({ title: e.target.value })}
                  showCount
                  minLength={5}
                  maxLength={150}
                />
                <AIGeneratorButton
                  type="title"
                  context={{ category: formData.categoryId }}
                  onGenerate={(text) => update({ title: text })}
                />
              </div>
              <div className="space-y-1">
                <Textarea
                  label="Descripción"
                  placeholder="Contá el estado, detalles importantes, por qué lo vendés…"
                  rows={5}
                  value={formData.description}
                  onChange={(e) => update({ description: e.target.value })}
                  showCount
                  minLength={20}
                  maxLength={5000}
                />
                <AIGeneratorButton
                  type="description"
                  context={{ category: formData.categoryId, title: formData.title }}
                  onGenerate={(text) => update({ description: text })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-tradealo-text mb-2">
                  Estado del artículo
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
              <div className="border-t border-tradealo-border pt-4">
                <h3 className="font-heading font-semibold text-sm mb-2">
                  Video de presentación (opcional)
                </h3>
                <Input
                  label="Link o ID de YouTube"
                  placeholder="Ej: https://youtube.com/watch?v=dQw4w9WgXcQ"
                  value={formData.youtubeLiveId}
                  onChange={(e) => update({ youtubeLiveId: e.target.value })}
                  helper="Mostrá tu producto en video. Acepta link de YouTube o ID del video."
                />
                {formData.youtubeLiveId && extractYoutubeId(formData.youtubeLiveId) && (
                  <div className="mt-2 aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${extractYoutubeId(formData.youtubeLiveId)}?rel=0`}
                      className="w-full h-full"
                      allow="encrypted-media"
                      allowFullScreen
                      title="Vista previa del video"
                    />
                  </div>
                )}
              </div>
              {formData.categoryAttributes && formData.categoryAttributes.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-heading font-semibold text-sm">
                    Características específicas
                  </h3>
                  {formData.categoryAttributes.map((attr) => (
                    <div key={attr.key}>
                      {attr.type === 'select' && attr.options ? (
                        <div>
                          <label className="block text-sm font-medium text-tradealo-text mb-1.5">
                            {attr.label}
                            {attr.required && <span className="text-tradealo-error ml-1">*</span>}
                          </label>
                          <select
                            value={String(formData.attributes[attr.key] ?? '')}
                            onChange={(e) =>
                              update({ attributes: { ...formData.attributes, [attr.key]: e.target.value } })
                            }
                            className="w-full h-11 rounded-lg border border-tradealo-border px-3 text-sm focus:outline-none focus:border-tradealo-primary"
                          >
                            <option value="">Seleccioná…</option>
                            {attr.options.map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        </div>
                      ) : attr.type === 'boolean' ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!formData.attributes[attr.key]}
                            onChange={(e) =>
                              update({ attributes: { ...formData.attributes, [attr.key]: e.target.checked } })
                            }
                            className="w-4 h-4 rounded text-tradealo-primary"
                          />
                          <span className="text-sm font-medium">{attr.label}</span>
                        </label>
                      ) : (
                        <Input
                          label={attr.label}
                          type={attr.type === 'number' ? 'number' : 'text'}
                          value={String(formData.attributes[attr.key] ?? '')}
                          onChange={(e) =>
                            update({ attributes: { ...formData.attributes, [attr.key]: e.target.value } })
                          }
                          placeholder={attr.label}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 4 — Photos */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-heading font-semibold text-lg">
                Paso 4: Fotos del producto
              </h2>
              <p className="text-sm text-tradealo-text-muted">
                Subí al menos 1 foto. Las primeras fotos son las más vistas.
              </p>
              {listingId ? (
                <ImageUploader listingId={listingId} maxImages={8} />
              ) : (
                <p className="text-sm text-tradealo-error">
                  Hubo un error al crear el borrador. Volvé al paso anterior.
                </p>
              )}
            </div>
          )}

          {/* STEP 5 — Price & contact */}
          {step === 5 && (
            <div className="space-y-5">
              <h2 className="font-heading font-semibold text-lg">
                Paso 5: Precio y contacto
              </h2>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    label="Precio"
                    type="number"
                    placeholder="0"
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
                    onChange={(e) => update({ currency: e.target.value as 'ARS' | 'USD' })}
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
              <div className="border-t border-tradealo-border pt-4">
                <label className="block text-sm font-medium text-tradealo-text mb-2">
                  Tipo de venta
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'contact' as SaleType, label: 'Contacto libre', desc: 'Te contactan y arreglan' },
                    { value: 'stock' as SaleType, label: 'Stock', desc: 'Vendé con cantidad' },
                    { value: 'auction' as SaleType, label: 'Subasta', desc: 'Ofertas y precio deseado' },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update({ saleType: opt.value })}
                      className={cn(
                        'p-3 rounded-xl border text-left transition-all',
                        formData.saleType === opt.value
                          ? 'border-tradealo-primary bg-tradealo-primary-light'
                          : 'border-tradealo-border bg-white hover:border-tradealo-primary/40'
                      )}
                    >
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-[10px] text-tradealo-text-muted mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
                {formData.saleType === 'stock' && (
                  <div className="mt-3">
                    <Input
                      label="Cantidad en stock"
                      type="number"
                      placeholder="Ej: 5"
                      min="1"
                      value={formData.stock}
                      onChange={(e) => update({ stock: e.target.value })}
                    />
                  </div>
                )}
                {formData.saleType === 'auction' && (
                  <div className="mt-3">
                    <Input
                      label="Precio deseado (opcional)"
                      type="number"
                      placeholder="Ej: 50000"
                      min="0"
                      value={formData.desiredPrice}
                      onChange={(e) => update({ desiredPrice: e.target.value })}
                      helper="Si alguien ofrece este monto, la subasta finaliza automáticamente"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-tradealo-text mb-2">
                  Métodos de pago aceptados
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
              <Textarea
                label="Detalles de envío (opcional)"
                placeholder="Ej: Envío a todo el país por Correo Argentino, costo a cargo del comprador"
                rows={3}
                value={formData.shippingDescription}
                onChange={(e) => update({ shippingDescription: e.target.value })}
                showCount
                maxLength={500}
              />

              <div className="border-t border-tradealo-border pt-4">
                <h3 className="font-heading font-semibold text-sm mb-3">
                  Datos de contacto para el comprador
                </h3>
                <p className="text-xs text-tradealo-text-muted mb-3">
                  Estos datos se enviarán automáticamente al comprador cuando realice una compra.
                </p>
                <Input
                  label="Teléfono de contacto"
                  type="tel"
                  placeholder="Ej: +54 9 11 1234-5678"
                  value={formData.contactPhone}
                  onChange={(e) => update({ contactPhone: e.target.value })}
                />
                <label className="flex items-center gap-2 cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={formData.showWhatsApp}
                    onChange={(e) => update({ showWhatsApp: e.target.checked })}
                    className="w-4 h-4 rounded text-tradealo-primary"
                  />
                  <span className="text-sm font-medium">Mostrar link de WhatsApp</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 6 — Location */}
          {step === 6 && (
            <div className="space-y-5">
              <h2 className="font-heading font-semibold text-lg">
                Paso 6: Ubicación
              </h2>
              <ProvinceSelector
                label="Provincia"
                value={formData.province}
                onChange={(e) => update({ province: e.target.value })}
              />
              <Input
                label="Ciudad"
                placeholder="Ej: Córdoba"
                value={formData.city}
                onChange={(e) => update({ city: e.target.value })}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition(
                    () => toast.info('Ubicación obtenida'),
                    () => toast.error('No pudimos obtener tu ubicación')
                  );
                }}
              >
                Usar mi ubicación
              </Button>
            </div>
          )}

          {/* STEP 7 — Type & duration */}
          {step === 7 && (
            <div className="space-y-6">
              <h2 className="font-heading font-semibold text-lg">
                Paso 7: Tipo y duración
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
                      {t === 'standard'
                        ? 'Gratis con tu cuota mensual'
                        : 'Destacado — requiere tokens'}
                    </p>
                    <p className="text-xs font-semibold text-tradealo-primary mt-2">
                      Base: {LISTING_BASE_COST[t]} token
                      {LISTING_BASE_COST[t] !== 1 ? 's' : ''}
                    </p>
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-tradealo-text mb-2">
                  Duración
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {LISTING_DURATION_PRESETS.map((d) => (
                    <button
                      key={d.days}
                      type="button"
                      onClick={() => update({ durationDays: d.days })}
                      className={cn(
                        'py-3 rounded-xl border text-sm font-medium transition-all',
                        formData.durationDays === d.days
                          ? 'border-tradealo-primary bg-tradealo-primary-light text-tradealo-primary-hover'
                          : 'border-tradealo-border bg-white hover:border-tradealo-primary/40'
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
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-tradealo-border">
                <h3 className="font-heading font-semibold text-sm">
                  Resumen de costo
                </h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-tradealo-text-muted">Tipo</span>
                  <span className="capitalize">{formData.type}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-tradealo-text-muted">Duración</span>
                  <span>{formData.durationDays} días</span>
                </div>
                <div className="flex items-center justify-between font-semibold pt-2 border-t border-tradealo-border">
                  <span>Total</span>
                  <TokenBadge tokens={totalCost} size="md" />
                </div>
                <div className="flex items-center justify-between text-xs text-tradealo-text-muted">
                  <span>Tu balance</span>
                  <span>{balanceData?.balance ?? 0} tokens</span>
                </div>
                {!canAfford && (
                  <p className="text-xs text-tradealo-error pt-1">
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
              <div className="bg-tradealo-primary-light rounded-xl p-4 space-y-1 text-sm">
                <p className="font-heading font-semibold text-tradealo-primary-hover">
                  Resumen de tu publicación
                </p>
                <p className="text-tradealo-text truncate">
                  <span className="font-medium">Título: </span>
                  {formData.title}
                </p>
                <p className="text-tradealo-text">
                  <span className="font-medium">Precio: </span>
                  {formData.price} {formData.currency}
                </p>
                <p className="text-tradealo-text">
                  <span className="font-medium">Ubicación: </span>
                  {formData.city ? `${formData.city}, ` : ''}
                  {formData.province}
                </p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={step === 1}
          leftIcon={<ChevronLeft size={16} />}
        >
          Anterior
        </Button>
        {step === 3 && flowType === 'live' ? (
          <Button onClick={handleCreateLive} loading={saving}>
            Crear publicación en vivo
          </Button>
        ) : step < maxStep ? (
          <Button
            onClick={goNext}
            loading={saving}
            rightIcon={<ChevronRight size={16} />}
          >
            Siguiente
          </Button>
        ) : (
          <Button
            data-testid="publish-btn"
            onClick={handlePublish}
            loading={saving}
            disabled={!canAfford}
          >
            Publicar
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
