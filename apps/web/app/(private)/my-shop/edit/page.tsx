'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { shop as shopApi } from '@/lib/api';
import type { Shop, ShopTheme } from '@/types';

const BannerGenerator = dynamic(
  () => import('@/components/shop/BannerGenerator'),
  { ssr: false },
);

const THEMES: { value: ShopTheme; label: string; preview: string }[] = [
  { value: 'minimalista', label: 'Minimalista', preview: '#14b8a6' },
  { value: 'oscuro', label: 'Oscuro', preview: '#38bdf8' },
  { value: 'vibrante', label: 'Vibrante', preview: '#f97316' },
  { value: 'clasico', label: 'Clásico', preview: '#78716c' },
  { value: 'boutique', label: 'Boutique', preview: '#a855f7' },
];

type FormKey =
  | 'slug' | 'shopName' | 'tagline' | 'about' | 'theme'
  | 'whatsappBusiness' | 'locationText' | 'metaTitle' | 'metaDescription'
  | 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'twitter' | 'website';

type FieldErrors = Partial<Record<FormKey, string>>;

// Maps NestJS property names / keywords → form field keys
const FIELD_KEYWORDS: [string, FormKey][] = [
  ['slug', 'slug'],
  ['nombre de tienda', 'slug'],
  ['shopName', 'shopName'],
  ['tagline', 'tagline'],
  ['about', 'about'],
  ['whatsappBusiness', 'whatsappBusiness'],
  ['whatsapp', 'whatsappBusiness'],
  ['locationText', 'locationText'],
  ['ubicación', 'locationText'],
  ['metaTitle', 'metaTitle'],
  ['metaDescription', 'metaDescription'],
  ['instagram', 'instagram'],
  ['facebook', 'facebook'],
  ['tiktok', 'tiktok'],
  ['youtube', 'youtube'],
  ['twitter', 'twitter'],
  ['website', 'website'],
];

function parseApiFieldErrors(err: unknown): { fieldErrors: FieldErrors; generic: string } {
  const data = (err as { response?: { data?: { message?: string | string[] } } }).response?.data;
  const raw = data?.message;
  const messages: string[] = Array.isArray(raw) ? raw : raw ? [raw] : ['No se pudo guardar. Intentá de nuevo.'];

  const fieldErrors: FieldErrors = {};
  const unmatched: string[] = [];

  for (const msg of messages) {
    const lower = msg.toLowerCase();
    let matched = false;
    for (const [keyword, field] of FIELD_KEYWORDS) {
      if (lower.includes(keyword.toLowerCase())) {
        fieldErrors[field] = msg;
        matched = true;
        break;
      }
    }
    if (!matched) unmatched.push(msg);
  }

  return { fieldErrors, generic: unmatched.join(' · ') };
}

export default function EditShopPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [genericError, setGenericError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState('');

  // Banner state
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [showBannerGen, setShowBannerGen] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    slug: '',
    shopName: '',
    tagline: '',
    about: '',
    theme: 'minimalista' as ShopTheme,
    whatsappBusiness: '',
    locationText: '',
    metaTitle: '',
    metaDescription: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    youtube: '',
    twitter: '',
    website: '',
  });

  useEffect(() => {
    shopApi.getMyShop().then((s: Shop) => {
      const sl = s.socialLinks ?? {};
      setForm({
        slug: s.slug ?? '',
        shopName: s.shopName ?? '',
        tagline: s.tagline ?? '',
        about: s.about ?? '',
        theme: s.theme,
        whatsappBusiness: s.whatsappBusiness ?? '',
        locationText: s.locationText ?? '',
        metaTitle: s.metaTitle ?? '',
        metaDescription: s.metaDescription ?? '',
        instagram: sl.instagram ?? '',
        facebook: sl.facebook ?? '',
        tiktok: sl.tiktok ?? '',
        youtube: sl.youtube ?? '',
        twitter: sl.twitter ?? '',
        website: sl.website ?? '',
      });
      setBannerUrl(s.bannerUrl ?? null);
      setLoading(false);
    }).catch(() => {
      router.push('/my-shop');
    });
  }, [router]);

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    setBannerError('');
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
        const mimetype = file.type || 'image/jpeg';
        const result = await shopApi.uploadBanner(base64, mimetype);
        setBannerUrl(result.bannerUrl);
        setBannerUploading(false);
      };
      reader.onerror = () => {
        setBannerError('No se pudo leer el archivo.');
        setBannerUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setBannerError('No se pudo subir el banner. Intentá de nuevo.');
      setBannerUploading(false);
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const setField = (key: FormKey, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((e) => { const n = { ...e }; delete n[key]; return n; });
    setGenericError('');
    setSuccess('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setGenericError('');
    setFieldErrors({});
    setSuccess('');
    try {
      await shopApi.updateProfile({
        slug: form.slug || undefined,
        shopName: form.shopName || undefined,
        tagline: form.tagline || undefined,
        about: form.about || undefined,
        theme: form.theme,
        whatsappBusiness: form.whatsappBusiness || undefined,
        locationText: form.locationText || undefined,
        metaTitle: form.metaTitle || undefined,
        metaDescription: form.metaDescription || undefined,
        socialLinks: {
          instagram: form.instagram || undefined,
          facebook: form.facebook || undefined,
          tiktok: form.tiktok || undefined,
          youtube: form.youtube || undefined,
          twitter: form.twitter || undefined,
          website: form.website || undefined,
        },
      });
      setSuccess('¡Cambios guardados!');
    } catch (err) {
      const { fieldErrors: fe, generic } = parseApiFieldErrors(err);
      if (Object.keys(fe).length > 0) {
        setFieldErrors(fe);
        if (generic) setGenericError(generic);
      } else {
        setGenericError(generic || 'No se pudo guardar. Intentá de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-sm text-gray-500">Cargando…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar perfil de tienda</h1>

      {genericError && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{genericError}</div>
      )}
      {success && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-700">{success}</div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Banner section */}
        <section className="space-y-4">
          <h2 className="font-semibold text-gray-800 border-b pb-2">Banner</h2>

          {/* Current banner preview */}
          {bannerUrl && (
            <div className="relative w-full h-32 rounded-xl overflow-hidden">
              <Image
                src={bannerUrl}
                alt="Banner actual"
                fill
                className="object-cover"
              />
            </div>
          )}

          {bannerError && (
            <p className="text-xs text-red-600">{bannerError}</p>
          )}

          {/* Upload options */}
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              disabled={bannerUploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-teal-400 hover:text-teal-600 transition-colors disabled:opacity-50"
            >
              {bannerUploading ? 'Subiendo…' : '📁 Subir imagen'}
            </button>
            <button
              type="button"
              onClick={() => setShowBannerGen((v) => !v)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                showBannerGen
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-gray-200 text-gray-700 hover:border-teal-400 hover:text-teal-600'
              }`}
            >
              ✨ Generar automático
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBannerFileChange}
          />

          {/* Banner generator */}
          {showBannerGen && (
            <BannerGenerator
              shopName={form.shopName}
              tagline={form.tagline}
              onSuccess={(url) => {
                setBannerUrl(url);
                setShowBannerGen(false);
              }}
            />
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold text-gray-800 border-b pb-2">Información básica</h2>

          <Field label="URL de tu tienda" maxLength={60} error={fieldErrors.slug}>
            <div className={`flex items-center rounded-xl border overflow-hidden focus-within:ring-2 ${fieldErrors.slug ? 'border-red-400 focus-within:ring-red-100' : 'border-gray-200 focus-within:border-teal-500 focus-within:ring-teal-100'}`}>
              <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 whitespace-nowrap">trocalia.ar/shop/</span>
              <input
                value={form.slug}
                maxLength={60}
                placeholder="betostore"
                className="flex-1 px-3 py-2 text-sm bg-white focus:outline-none"
                onChange={(e) => setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Solo letras minúsculas, números y guiones. Si no definís uno, se usa tu username.</p>
          </Field>

          <Field label="Nombre de la tienda" maxLength={100} error={fieldErrors.shopName}>
            <input
              value={form.shopName} maxLength={100} placeholder="Mi Tienda"
              className={inputCls(!!fieldErrors.shopName)}
              onChange={(e) => setField('shopName', e.target.value)}
            />
          </Field>

          <Field label="Tagline" maxLength={200} error={fieldErrors.tagline}>
            <input
              value={form.tagline} maxLength={200} placeholder="Tu eslogan aquí"
              className={inputCls(!!fieldErrors.tagline)}
              onChange={(e) => setField('tagline', e.target.value)}
            />
          </Field>

          <Field label="Descripción" error={fieldErrors.about}>
            <textarea
              value={form.about} rows={4} placeholder="Contá de qué se trata tu tienda…"
              className={inputCls(!!fieldErrors.about)}
              onChange={(e) => setField('about', e.target.value)}
            />
          </Field>

          <Field label="WhatsApp de negocio" error={fieldErrors.whatsappBusiness}>
            <input
              value={form.whatsappBusiness} placeholder="+54 9 11 1234-5678"
              className={inputCls(!!fieldErrors.whatsappBusiness)}
              onChange={(e) => setField('whatsappBusiness', e.target.value)}
            />
          </Field>

          <Field label="Ubicación" error={fieldErrors.locationText}>
            <input
              value={form.locationText} placeholder="Buenos Aires, Argentina"
              className={inputCls(!!fieldErrors.locationText)}
              onChange={(e) => setField('locationText', e.target.value)}
            />
          </Field>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-gray-800 border-b pb-2">Tema visual</h2>
          <div className="grid grid-cols-5 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.value} type="button"
                onClick={() => setField('theme', t.value)}
                className={`rounded-xl p-3 border-2 flex flex-col items-center gap-1.5 transition-all ${form.theme === t.value ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <span className="w-6 h-6 rounded-full" style={{ backgroundColor: t.preview }} />
                <span className="text-xs font-medium text-gray-700">{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold text-gray-800 border-b pb-2">Redes sociales</h2>
          {(['instagram', 'facebook', 'tiktok', 'youtube', 'twitter', 'website'] as const).map((net) => (
            <Field key={net} label={net.charAt(0).toUpperCase() + net.slice(1)} error={fieldErrors[net]}>
              <input
                value={form[net]}
                placeholder={net === 'website' ? 'https://tusitio.com' : `@usuario`}
                className={inputCls(!!fieldErrors[net])}
                onChange={(e) => setField(net, e.target.value)}
              />
            </Field>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold text-gray-800 border-b pb-2">SEO</h2>
          <Field label="Meta título" maxLength={100} error={fieldErrors.metaTitle}>
            <input
              value={form.metaTitle} maxLength={100}
              className={inputCls(!!fieldErrors.metaTitle)}
              onChange={(e) => setField('metaTitle', e.target.value)}
            />
          </Field>
          <Field label="Meta descripción" maxLength={300} error={fieldErrors.metaDescription}>
            <textarea
              value={form.metaDescription} rows={2} maxLength={300}
              className={inputCls(!!fieldErrors.metaDescription)}
              onChange={(e) => setField('metaDescription', e.target.value)}
            />
          </Field>
        </section>

        <button
          type="submit" disabled={saving}
          className="w-full py-3 rounded-xl text-white font-semibold bg-teal-500 hover:bg-teal-600 transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}

const inputCls = (hasError: boolean) =>
  `w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white ${
    hasError
      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
      : 'border-gray-200 focus:border-teal-500 focus:ring-teal-100'
  }`;

function Field({
  label,
  children,
  maxLength,
  error,
}: {
  label: string;
  children: React.ReactNode;
  maxLength?: number;
  error?: string;
}) {
  return (
    <div>
      <label className={`block text-sm font-medium mb-1 ${error ? 'text-red-600' : 'text-gray-700'}`}>
        {label}
        {maxLength ? <span className="text-gray-400 font-normal ml-1">(máx {maxLength})</span> : null}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
