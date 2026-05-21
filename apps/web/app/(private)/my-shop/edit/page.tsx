'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { shop as shopApi } from '@/lib/api';
import type { Shop, ShopTheme } from '@/types';

const THEMES: { value: ShopTheme; label: string; preview: string }[] = [
  { value: 'minimalista', label: 'Minimalista', preview: '#14b8a6' },
  { value: 'oscuro', label: 'Oscuro', preview: '#38bdf8' },
  { value: 'vibrante', label: 'Vibrante', preview: '#f97316' },
  { value: 'clasico', label: 'Clásico', preview: '#78716c' },
  { value: 'boutique', label: 'Boutique', preview: '#a855f7' },
];

export default function EditShopPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
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
      setLoading(false);
    }).catch(() => {
      router.push('/my-shop');
    });
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await shopApi.updateProfile({
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
    } catch {
      setError('No se pudo guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-sm text-gray-500">Cargando…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar perfil de tienda</h1>

      {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-700">{success}</div>}

      <form onSubmit={handleSave} className="space-y-6">
        <section className="space-y-4">
          <h2 className="font-semibold text-gray-800 border-b pb-2">Información básica</h2>
          <Field label="Nombre de la tienda" maxLength={100}>
            <input {...field('shopName')} maxLength={100} className={inputCls} placeholder="Mi Tienda" />
          </Field>
          <Field label="Tagline" maxLength={200}>
            <input {...field('tagline')} maxLength={200} className={inputCls} placeholder="Tu eslogan aquí" />
          </Field>
          <Field label="Descripción">
            <textarea {...field('about')} rows={4} className={inputCls} placeholder="Contá de qué se trata tu tienda…" />
          </Field>
          <Field label="WhatsApp de negocio">
            <input {...field('whatsappBusiness')} className={inputCls} placeholder="+54 9 11 1234-5678" />
          </Field>
          <Field label="Ubicación">
            <input {...field('locationText')} className={inputCls} placeholder="Buenos Aires, Argentina" />
          </Field>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-gray-800 border-b pb-2">Tema visual</h2>
          <div className="grid grid-cols-5 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, theme: t.value }))}
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
            <Field key={net} label={net.charAt(0).toUpperCase() + net.slice(1)}>
              <input {...field(net)} className={inputCls} placeholder={net === 'website' ? 'https://tusitio.com' : `@usuario`} />
            </Field>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold text-gray-800 border-b pb-2">SEO</h2>
          <Field label="Meta título" maxLength={100}>
            <input {...field('metaTitle')} maxLength={100} className={inputCls} />
          </Field>
          <Field label="Meta descripción" maxLength={300}>
            <textarea {...field('metaDescription')} rows={2} maxLength={300} className={inputCls} />
          </Field>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl text-white font-semibold bg-teal-500 hover:bg-teal-600 transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-white';

function Field({ label, children, maxLength }: { label: string; children: React.ReactNode; maxLength?: number }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{maxLength ? <span className="text-gray-400 font-normal ml-1">(máx {maxLength})</span> : null}
      </label>
      {children}
    </div>
  );
}
