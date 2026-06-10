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
import {
  listings,
  wallet,
  categories as categoriesApi,
  listingVariants,
  type VariantInput,
  type ListingVariant,
} from '@/lib/api';
import { VariantsBuilder } from '@/components/listing/VariantsBuilder';
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

// ─── Step IDs ────────────────────────────────────────────────────────────────
const S_CATEGORY  = 1;
const S_SALE_TYPE = 2;
const S_DETAILS   = 3; // live: YouTube link  |  traditional: título/desc/atributos
const S_VARIANTS  = 4; // stock only
const S_PHOTOS    = 5;
const S_PRICE     = 6;
const S_PUBLISH   = 7;

const STEP_LABELS: Record<number, string> = {
  [S_CATEGORY]:  'Categoría',
  [S_SALE_TYPE]: 'Venta',
  [S_DETAILS]:   'Detalles',
  [S_VARIANTS]:  'Variantes',
  [S_PHOTOS]:    'Fotos',
  [S_PRICE]:     'Precio',
  [S_PUBLISH]:   'Publicar',
};

function getActiveSteps(saleType: SaleType | ''): number[] {
  if (saleType === 'live')  return [S_CATEGORY, S_SALE_TYPE, S_DETAILS];
  if (saleType === 'stock') return [S_CATEGORY, S_SALE_TYPE, S_DETAILS, S_VARIANTS, S_PHOTOS, S_PRICE, S_PUBLISH];
  return                           [S_CATEGORY, S_SALE_TYPE, S_DETAILS, S_PHOTOS, S_PRICE, S_PUBLISH];
}

// ─── Step indicator ──────────────────────────────────────────────────────────
function StepIndicator({ steps, currentStep }: { steps: number[]; currentStep: number }) {
  const currentIndex = steps.indexOf(currentStep);
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((stepId, i) => {
        const done   = i < currentIndex;
        const active = stepId === currentStep;
        return (
          <div key={stepId} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                  done   ? 'bg-tradealo-success text-white'
                  : active ? 'bg-tradealo-primary text-white'
                           : 'bg-gray-200 text-gray-500',
                )}
              >
                {done ? <Check size={12} strokeWidth={3} /> : i + 1}
              </div>
              <span className="text-[10px] text-tradealo-text-muted hidden sm:block">
                {STEP_LABELS[stepId]}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-1 rounded-full mb-4',
                  done ? 'bg-tradealo-primary' : 'bg-gray-200',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

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

// ─── Form state ──────────────────────────────────────────────────────────────
interface FormData {
  categoryId:               string;
  isCollectible:            boolean;
  categoryAttributes?:      Category['attributes'];
  saleType:                 SaleType | '';
  title:                    string;
  description:              string;
  condition:                import('@/types').ListingCondition;
  attributes:               Record<string, unknown>;
  price:                    string;
  currency:                 'ARS' | 'USD';
  negotiable:               boolean;
  paymentMethods:           string[];
  shippingOptions:          string[];
  shippingDescription:      string;
  province:                 string;
  city:                     string;
  type:                     'standard' | 'premium';
  durationDays:             number;
  stock:                    string;
  desiredPrice:             string;
  contactPhone:             string;
  showWhatsApp:             boolean;
  youtubeLiveId:            string;
  usePaymentDefaults:       boolean;
  paymentCbu:               string;
  paymentAlias:             string;
  paymentBankName:          string;
  paymentBankAccountType:   string;
  paymentBankAccountNumber: string;
  variants:                 VariantInput[];
}

const EMPTY_FORM: FormData = {
  categoryId:               '',
  isCollectible:            false,
  categoryAttributes:       undefined,
  saleType:                 '',
  title:                    '',
  description:              '',
  condition:                'used',
  attributes:               {},
  price:                    '',
  currency:                 'ARS',
  negotiable:               false,
  paymentMethods:           [],
  shippingOptions:          [],
  shippingDescription:      '',
  province:                 '',
  city:                     '',
  type:                     'standard',
  durationDays:             30,
  stock:                    '',
  desiredPrice:             '',
  contactPhone:             '',
  showWhatsApp:             false,
  youtubeLiveId:            '',
  usePaymentDefaults:       true,
  paymentCbu:               '',
  paymentAlias:             '',
  paymentBankName:          '',
  paymentBankAccountType:   '',
  paymentBankAccountNumber: '',
  variants:                 [],
};

// ─── Page ────────────────────────────────────────────────────────────────────
export default function NewListingPage() {
  const router = useRouter();
  const [step, setStep]                   = useState(S_CATEGORY);
  const [formData, setFormData]           = useState<FormData>(EMPTY_FORM);
  const [listingId, setListingId]         = useState<string | null>(null);
  const [savedVariants, setSavedVariants] = useState<ListingVariant[]>([]);
  const [saving, setSaving]               = useState(false);
  const [purchaseModal, setPurchaseModal] = useState(false);
  const [selectedPack, setSelectedPack]   = useState<TokenPack | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const activeSteps        = getActiveSteps(formData.saleType);
  const currentStepIndex   = activeSteps.indexOf(step);
  const displayStepNumber  = currentStepIndex + 1;
  const isLastStep         = currentStepIndex === activeSteps.length - 1;

  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  const { data: balanceData } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => wallet.getBalance(),
    staleTime: 60_000,
  });

  const { data: freeQuota } = useQuery({
    queryKey: ['free-quota'],
    queryFn: () => wallet.getFreeQuota(),
    staleTime: 30_000,
  });

  const { data: packs } = useQuery({
    queryKey: ['token-packs'],
    queryFn: () => wallet.getPacks(),
    staleTime: 300_000,
    enabled: step === S_PUBLISH,
  });

  const { data: selectedCategory } = useQuery({
    queryKey: ['category', formData.categoryId],
    queryFn: () => categoriesApi.getCategory(formData.categoryId),
    enabled: !!formData.categoryId,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (selectedCategory?.attributes) {
      setFormData((prev) => ({ ...prev, categoryAttributes: selectedCategory.attributes }));
    }
  }, [selectedCategory]);

  const update = (patch: Partial<FormData>) =>
    setFormData((prev) => ({ ...prev, ...patch }));

  const baseCost     = LISTING_BASE_COST[formData.type];
  const multiplier   = getDurationMultiplier(formData.durationDays);
  const totalCost    = Math.ceil(baseCost * multiplier);
  const balance      = balanceData?.balance ?? 0;
  const hasTokens    = balance >= totalCost;
  const hasFreeQuota = formData.type === 'standard' && (freeQuota?.remaining ?? 1) > 0;
  const canAfford    = hasTokens || hasFreeQuota;

  const buildPayload = () => ({
    categoryId:          formData.categoryId,
    type:                formData.type,
    title:               formData.title,
    description:         formData.description,
    condition:           formData.condition,
    collectibleAttributes: Object.keys(formData.attributes).length > 0 ? formData.attributes : undefined,
    price:               Number(formData.price),
    currency:            formData.currency,
    priceNegotiable:     formData.negotiable,
    saleType:            formData.saleType || 'contact',
    stock:               formData.stock ? Number(formData.stock) : undefined,
    desiredPrice:        formData.desiredPrice ? Number(formData.desiredPrice) : undefined,
    paymentMethods:      formData.paymentMethods,
    shippingOptions:     formData.shippingOptions,
    shippingDescription: formData.shippingDescription || undefined,
    province:            formData.province || undefined,
    city:                formData.city || undefined,
    contactInfo:         formData.contactPhone
      ? { phone: formData.contactPhone, showWhatsApp: formData.showWhatsApp }
      : undefined,
    youtubeLiveId:       extractYoutubeId(formData.youtubeLiveId) || undefined,
    paymentInfo:         formData.saleType === 'stock' && !formData.usePaymentDefaults
      ? {
          cbu:               formData.paymentCbu || undefined,
          alias:             formData.paymentAlias || undefined,
          bankName:          formData.paymentBankName || undefined,
          bankAccountType:   formData.paymentBankAccountType || undefined,
          bankAccountNumber: formData.paymentBankAccountNumber || undefined,
        }
      : undefined,
  });

  // ─── Navigation ─────────────────────────────────────────────────────────────
  const goNext = async () => {
    if (step === S_CATEGORY && !formData.categoryId) {
      toast.error('Seleccioná una categoría');
      return;
    }

    if (step === S_SALE_TYPE && !formData.saleType) {
      toast.error('Seleccioná cómo querés vender');
      return;
    }

    if (step === S_DETAILS && formData.saleType !== 'live') {
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

    if (step === S_VARIANTS && listingId && formData.variants.length > 0) {
      setSaving(true);
      try {
        const saved = await listingVariants.replaceAll(listingId, formData.variants);
        setSavedVariants(saved);
      } catch {
        toast.error('No se pudo guardar las variantes');
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    if (step === S_PRICE && (!formData.price || isNaN(Number(formData.price)))) {
      toast.error('Ingresá un precio válido');
      return;
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < activeSteps.length) {
      setStep(activeSteps[nextIndex]);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) setStep(activeSteps[prevIndex]);
  };

  const handleCreateLive = async () => {
    const youtubeId = extractYoutubeId(formData.youtubeLiveId);
    if (!youtubeId) {
      toast.error('Ingresá un link válido de YouTube');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...buildPayload(),
        title:       `En Vivo - ${selectedCategory?.name ?? formData.categoryId}`,
        description: 'Publicación generada automáticamente para venta en vivo por YouTube.',
        price:       0,
        saleType:    'live' as SaleType,
        type:        'standard' as const,
      };
      const created = await listings.createListing(payload);
      await listings.publishListing(created.id, { type: 'standard', durationDays: 30 });
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
    if (!formData.province) {
      toast.error('Seleccioná una provincia');
      return;
    }
    if (!canAfford) {
      toast.error('No tenés suficientes tokens');
      return;
    }
    setSaving(true);
    try {
      await listings.updateListing(listingId, buildPayload());
      await listings.publishListing(listingId, {
        type:        formData.type,
        durationDays: formData.durationDays,
      });
      toast.success('¡Publicación enviada a revisión!');
      router.push('/my-listings');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 402) {
        toast.error('Sin cuota mensual ni tokens suficientes. Comprá tokens para continuar.');
      } else {
        toast.error('No se pudo publicar. Intentá de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8" ref={formRef}>
      <h1 className="font-heading text-2xl font-bold text-tradealo-text mb-6">
        Nueva publicación
      </h1>

      <StepIndicator steps={activeSteps} currentStep={step} />

      <Card>
        <CardBody className="p-6 space-y-6">

          {/* ── STEP 1: Categoría ──────────────────────────────────────────── */}
          {step === S_CATEGORY && (
            <div>
              <h2 className="font-heading font-semibold text-lg mb-4">
                Paso {displayStepNumber}: Elegí una categoría
              </h2>
              <CategorySelector
                value={formData.categoryId}
                onChange={(catId, isCollectible, attrs) => {
                  update({ categoryId: catId, isCollectible, categoryAttributes: attrs });
                  setStep(S_SALE_TYPE);
                }}
              />
            </div>
          )}

          {/* ── STEP 2: Método de venta ────────────────────────────────────── */}
          {step === S_SALE_TYPE && (
            <div className="space-y-5">
              <h2 className="font-heading font-semibold text-lg">
                Paso {displayStepNumber}: ¿Cómo querés vender?
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {([
                  {
                    value:  'contact' as SaleType,
                    label:  'Contacto libre',
                    desc:   'Los compradores te contactan para coordinar precio y entrega.',
                  },
                  {
                    value:  'stock' as SaleType,
                    label:  'Con stock',
                    desc:   'Definí cantidad, variantes (talle, color…) y precio por opción.',
                  },
                  {
                    value:  'auction' as SaleType,
                    label:  'Subasta',
                    desc:   'Los compradores hacen ofertas; el mejor precio gana.',
                  },
                  {
                    value:  'live' as SaleType,
                    label:  'En Vivo',
                    desc:   'Publicación automática vinculada a tu transmisión de YouTube.',
                  },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ saleType: opt.value })}
                    className={cn(
                      'p-5 rounded-xl border-2 text-left transition-all',
                      formData.saleType === opt.value
                        ? 'border-tradealo-primary bg-tradealo-primary-light'
                        : 'border-tradealo-border bg-white hover:border-tradealo-primary/40',
                    )}
                  >
                    <h3 className="font-heading font-semibold text-base mb-1">{opt.label}</h3>
                    <p className="text-xs text-tradealo-text-muted leading-relaxed">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 3a: Detalles del producto (traditional) ───────────────── */}
          {step === S_DETAILS && formData.saleType !== 'live' && (
            <div className="space-y-5">
              <h2 className="font-heading font-semibold text-lg">
                Paso {displayStepNumber}: Detalles del producto
              </h2>

              <Input
                label="Título"
                placeholder="Ej: Zapatillas Nike Air Max talle 42"
                value={formData.title}
                onChange={(e) => update({ title: e.target.value })}
                showCount
                minLength={5}
                maxLength={150}
              />

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
                  titleRequired={!formData.title.trim() || formData.title.trim().length < 5}
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
                          : 'border-tradealo-border bg-white hover:border-tradealo-primary/40',
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Atributos de categoría */}
              {formData.categoryAttributes && formData.categoryAttributes.length > 0 && (
                <div className="space-y-4 border-t border-tradealo-border pt-4">
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
                            {(attr.options?.values ?? []).map((o) => (
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

              {/* Video opcional */}
              <div className="border-t border-tradealo-border pt-4">
                <h3 className="font-heading font-semibold text-sm mb-2">
                  Video de presentación (opcional)
                </h3>
                <Input
                  label="Link o ID de YouTube"
                  placeholder="Ej: https://youtube.com/watch?v=dQw4w9WgXcQ"
                  value={formData.youtubeLiveId}
                  onChange={(e) => update({ youtubeLiveId: e.target.value })}
                  helper="Mostrá tu producto en video."
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
            </div>
          )}

          {/* ── STEP 3b: Link YouTube (live) ───────────────────────────────── */}
          {step === S_DETAILS && formData.saleType === 'live' && (
            <div className="space-y-5">
              <h2 className="font-heading font-semibold text-lg">
                Paso {displayStepNumber}: Link de tu transmisión
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
                  La publicación se crea automáticamente y se publica de inmediato por 30 días.
                  El título será &ldquo;En Vivo — {selectedCategory?.name ?? '...'}&rdquo;.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 4: Variantes (stock only) ────────────────────────────── */}
          {step === S_VARIANTS && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading font-semibold text-lg">
                  Paso {displayStepNumber}: Variantes
                </h2>
                <p className="text-sm text-tradealo-text-muted mt-1">
                  Definí las opciones (color, talle, capacidad…) y el stock por combinación.
                  Si vendés un único producto sin opciones, podés saltear este paso.
                </p>
              </div>
              <VariantsBuilder
                attributes={formData.categoryAttributes ?? []}
                value={formData.variants}
                onChange={(variants) => update({ variants })}
              />
              {formData.variants.length > 0 && (
                <p className="text-xs text-tradealo-text-muted">
                  En el paso siguiente podrás asignar fotos a cada variante.
                </p>
              )}
            </div>
          )}

          {/* ── STEP 5: Fotos ─────────────────────────────────────────────── */}
          {step === S_PHOTOS && (
            <div className="space-y-4">
              <div>
                <h2 className="font-heading font-semibold text-lg">
                  Paso {displayStepNumber}: Fotos del producto
                </h2>
                <p className="text-sm text-tradealo-text-muted mt-1">
                  Subí al menos 1 foto.
                  {savedVariants.length > 0 && ' Podés asignar cada foto a una variante específica.'}
                </p>
              </div>
              {listingId ? (
                <ImageUploader
                  listingId={listingId}
                  maxImages={8}
                  variants={savedVariants.length > 0 ? savedVariants : undefined}
                />
              ) : (
                <p className="text-sm text-tradealo-error">
                  Hubo un error al crear el borrador. Volvé al paso anterior.
                </p>
              )}
            </div>
          )}

          {/* ── STEP 6: Precio y envío ────────────────────────────────────── */}
          {step === S_PRICE && (
            <div className="space-y-5">
              <h2 className="font-heading font-semibold text-lg">
                Paso {displayStepNumber}: Precio y envío
              </h2>

              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    label={
                      formData.saleType === 'stock' && formData.variants.length > 0
                        ? 'Precio base (las variantes pueden tener precio propio)'
                        : 'Precio'
                    }
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

              {/* Stock global — solo si stock sin variantes */}
              {formData.saleType === 'stock' && formData.variants.length === 0 && (
                <Input
                  label="Cantidad en stock"
                  type="number"
                  placeholder="Ej: 5"
                  min="1"
                  value={formData.stock}
                  onChange={(e) => update({ stock: e.target.value })}
                />
              )}

              {/* Precio deseado (subasta) */}
              {formData.saleType === 'auction' && (
                <Input
                  label="Precio deseado (opcional)"
                  type="number"
                  placeholder="Ej: 50000"
                  min="0"
                  value={formData.desiredPrice}
                  onChange={(e) => update({ desiredPrice: e.target.value })}
                  helper="Si alguien ofrece este monto, la subasta finaliza automáticamente"
                />
              )}

              {/* Datos de cobro (stock) */}
              {formData.saleType === 'stock' && (
                <div className="border-t border-tradealo-border pt-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.usePaymentDefaults}
                      onChange={(e) => update({ usePaymentDefaults: e.target.checked })}
                      className="w-4 h-4 rounded text-tradealo-primary"
                    />
                    <span className="text-sm">Usar mis datos de pago guardados</span>
                  </label>
                  {!formData.usePaymentDefaults && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl">
                      <Input label="CBU" placeholder="0000000000000000000000" maxLength={22}
                        value={formData.paymentCbu}
                        onChange={(e) => update({ paymentCbu: e.target.value })} />
                      <Input label="Alias" placeholder="mi.alias.de.cbu" maxLength={50}
                        value={formData.paymentAlias}
                        onChange={(e) => update({ paymentAlias: e.target.value })} />
                      <Input label="Banco" placeholder="Ej: Banco Nación" maxLength={100}
                        value={formData.paymentBankName}
                        onChange={(e) => update({ paymentBankName: e.target.value })} />
                      <Input label="Tipo de cuenta" placeholder="corriente / caja de ahorro" maxLength={30}
                        value={formData.paymentBankAccountType}
                        onChange={(e) => update({ paymentBankAccountType: e.target.value })} />
                      <Input label="Número de cuenta" placeholder="Ej: 123456789" maxLength={30}
                        value={formData.paymentBankAccountNumber}
                        onChange={(e) => update({ paymentBankAccountNumber: e.target.value })} />
                    </div>
                  )}
                </div>
              )}

              {/* Métodos de pago */}
              <div className="border-t border-tradealo-border pt-4">
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

              {/* Envío */}
              <div className="border-t border-tradealo-border pt-4">
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
                <Textarea
                  label="Detalles de envío (opcional)"
                  placeholder="Ej: Envío a todo el país, costo a cargo del comprador"
                  rows={3}
                  value={formData.shippingDescription}
                  onChange={(e) => update({ shippingDescription: e.target.value })}
                  showCount
                  maxLength={500}
                  className="mt-3"
                />
              </div>

              {/* Contacto */}
              <div className="border-t border-tradealo-border pt-4">
                <h3 className="font-heading font-semibold text-sm mb-2">
                  Datos de contacto
                </h3>
                <p className="text-xs text-tradealo-text-muted mb-3">
                  Se envían automáticamente al comprador al realizar una compra.
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

          {/* ── STEP 7: Publicar (ubicación + tipo + duración + resumen) ───── */}
          {step === S_PUBLISH && (
            <div className="space-y-6">
              <h2 className="font-heading font-semibold text-lg">
                Paso {displayStepNumber}: Revisá y publicá
              </h2>

              {/* Ubicación */}
              <div className="space-y-3">
                <h3 className="font-heading font-semibold text-sm">Ubicación</h3>
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
                      () => toast.error('No pudimos obtener tu ubicación'),
                    );
                  }}
                >
                  Usar mi ubicación
                </Button>
              </div>

              {/* Tipo de publicación */}
              <div className="border-t border-tradealo-border pt-5 space-y-3">
                <h3 className="font-heading font-semibold text-sm">Tipo de publicación</h3>
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
                          : 'border-tradealo-border bg-white hover:border-tradealo-primary/40',
                      )}
                    >
                      <p className="font-heading font-semibold capitalize">{t}</p>
                      <p className="text-xs text-tradealo-text-muted mt-1">
                        {t === 'standard'
                          ? 'Gratis con tu cuota mensual'
                          : 'Destacado — requiere tokens'}
                      </p>
                      <p className="text-xs font-semibold text-tradealo-primary mt-2">
                        Base: {LISTING_BASE_COST[t]} token{LISTING_BASE_COST[t] !== 1 ? 's' : ''}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duración */}
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
                          : 'border-tradealo-border bg-white hover:border-tradealo-primary/40',
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
                  <span className="text-sm text-tradealo-text-muted">días (1–90)</span>
                </div>
              </div>

              {/* Resumen de costo */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-tradealo-border">
                <h3 className="font-heading font-semibold text-sm">Resumen de costo</h3>
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
                {formData.type === 'standard' && freeQuota && (
                  <div className="flex items-center justify-between text-xs text-tradealo-text-muted">
                    <span>Cuota mensual gratis</span>
                    <span className={freeQuota.remaining > 0 ? 'text-tradealo-success font-medium' : 'text-tradealo-error'}>
                      {freeQuota.remaining}/{freeQuota.quota} disponibles
                    </span>
                  </div>
                )}
                {!canAfford && (
                  <p className="text-xs text-tradealo-error pt-1">
                    Sin cuota mensual ni tokens suficientes.{' '}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        const cheap = packs?.sort((a, b) => a.priceArs - b.priceArs)[0];
                        if (cheap) { setSelectedPack(cheap); setPurchaseModal(true); }
                      }}
                    >
                      Comprá tokens
                    </button>
                  </p>
                )}
              </div>

              {/* Resumen de publicación */}
              <div className="bg-tradealo-primary-light rounded-xl p-4 space-y-1 text-sm">
                <p className="font-heading font-semibold text-tradealo-primary-hover">Resumen</p>
                <p className="text-tradealo-text truncate">
                  <span className="font-medium">Título: </span>{formData.title}
                </p>
                <p className="text-tradealo-text">
                  <span className="font-medium">Precio: </span>
                  {formData.price} {formData.currency}
                </p>
                {formData.variants.length > 0 && (
                  <p className="text-tradealo-text">
                    <span className="font-medium">Variantes: </span>
                    {formData.variants.length} combinaciones
                  </p>
                )}
                <p className="text-tradealo-text">
                  <span className="font-medium">Ubicación: </span>
                  {formData.city ? `${formData.city}, ` : ''}{formData.province}
                </p>
              </div>
            </div>
          )}

        </CardBody>
      </Card>

      {/* ── Navigation buttons ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={step === S_CATEGORY}
          leftIcon={<ChevronLeft size={16} />}
        >
          Anterior
        </Button>

        {step === S_DETAILS && formData.saleType === 'live' ? (
          <Button onClick={handleCreateLive} loading={saving}>
            Crear publicación en vivo
          </Button>
        ) : isLastStep ? (
          <Button
            data-testid="publish-btn"
            onClick={handlePublish}
            loading={saving}
            disabled={!canAfford}
          >
            Publicar
          </Button>
        ) : (
          <Button
            onClick={goNext}
            loading={saving}
            rightIcon={<ChevronRight size={16} />}
          >
            Siguiente
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
