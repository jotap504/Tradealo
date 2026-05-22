'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { shop as shopApi } from '@/lib/api';
import type { ShopGalleryImage } from '@/types';

export default function ShopGalleryPage() {
  const [images, setImages] = useState<ShopGalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    shopApi.getMyShop().then((s) => {
      if (s?.gallery) setImages(s.gallery);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (images.length >= 10) { setError('Máximo 10 fotos.'); return; }
    setUploading(true);
    setError('');
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const newImg = await shopApi.addGalleryImage(base64, file.type);
        setImages((prev) => [
          ...prev,
          { id: newImg.id, url: newImg.url, shopId: '', sortOrder: prev.length, createdAt: new Date().toISOString() },
        ]);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setError('No se pudo subir la imagen.');
      setUploading(false);
    }
    e.target.value = '';
  };

  const handleRemove = async (id: string) => {
    if (!confirm('¿Eliminar esta foto?')) return;
    try {
      await shopApi.removeGalleryImage(id);
      setImages((prev) => prev.filter((i) => i.id !== id));
    } catch {
      setError('No se pudo eliminar.');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-sm text-gray-500">Cargando…</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/my-shop" className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500" aria-label="Volver">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-heading text-xl font-bold text-tradealo-text">Galería</h1>
            <p className="text-sm text-tradealo-text-muted">{images.length}/10 fotos</p>
          </div>
        </div>
        {images.length < 10 && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-xl text-white bg-teal-500 hover:bg-teal-600 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {uploading ? 'Subiendo…' : '+ Agregar foto'}
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}

      {images.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-sm">Agregá hasta 10 fotos de tu local, oficina o productos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200">
              <Image src={img.url} alt="Foto de galería" fill className="object-cover" />
              <button
                onClick={() => handleRemove(img.id)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Eliminar"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
