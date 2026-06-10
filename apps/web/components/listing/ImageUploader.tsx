'use client';

import { useState, useCallback, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { images as imagesApi } from '@/lib/api';
import type { ListingVariant } from '@/lib/api';
import { toast } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { ListingImage } from '@/types';

interface Props {
  listingId: string;
  initialImages?: ListingImage[];
  maxImages?: number;
  onChange?: (imgs: ListingImage[]) => void;
  variants?: ListingVariant[];
}

export function ImageUploader({
  listingId,
  initialImages = [],
  maxImages = 8,
  onChange,
  variants,
}: Props) {
  const [imgs, setImgs] = useState<ListingImage[]>(initialImages);
  const [uploading, setUploading] = useState<number>(0);
  const [dragActive, setDragActive] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Solo se permiten imágenes');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen no puede superar 5 MB');
        return;
      }
      try {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const image = await imagesApi.upload(listingId, data, file.type);
        setImgs((prev) => {
          const next = [...prev, { ...image, sortOrder: prev.length }];
          onChange?.(next);
          return next;
        });
      } catch (err: unknown) {
        const apiMsg = (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message;
        toast.error(apiMsg ?? 'Falló la subida de la imagen');
      }
    },
    [listingId, onChange]
  );

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const remaining = maxImages - imgs.length;
    if (remaining <= 0) {
      toast.error(`Máximo ${maxImages} imágenes`);
      return;
    }
    const slice = arr.slice(0, remaining);
    setUploading(slice.length);
    for (const f of slice) {
      await upload(f);
      setUploading((c) => c - 1);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = '';
  };

  const remove = async (id: string) => {
    try {
      await imagesApi.deleteImage(listingId, id);
      setImgs((prev) => {
        const next = prev
          .filter((i) => i.id !== id)
          .map((i, idx) => ({ ...i, sortOrder: idx }));
        onChange?.(next);
        return next;
      });
    } catch {
      toast.error('No pudimos eliminar la imagen');
    }
  };

  const reorder = async (overId: string) => {
    if (!draggingId || draggingId === overId) return;
    const draggingIdx = imgs.findIndex((i) => i.id === draggingId);
    const overIdx = imgs.findIndex((i) => i.id === overId);
    if (draggingIdx === -1 || overIdx === -1) return;
    const next = [...imgs];
    const [moved] = next.splice(draggingIdx, 1);
    next.splice(overIdx, 0, moved);
    const reordered = next.map((i, idx) => ({ ...i, sortOrder: idx }));
    setImgs(reordered);
    onChange?.(reordered);
    try {
      await imagesApi.reorder(
        listingId,
        reordered.map((i) => i.id)
      );
    } catch {
      /* silently */
    }
  };

  const canAdd = imgs.length < maxImages;

  const variantLabel = (v: ListingVariant) =>
    Object.values(v.attributeValues).join(' / ') || v.id.slice(-6);

  const handleAssignVariant = async (imgId: string, variantId: string | null) => {
    try {
      await imagesApi.assignVariant(listingId, imgId, variantId);
      setImgs((prev) => {
        const next = prev.map((i) => i.id === imgId ? { ...i, variantId } : i);
        onChange?.(next);
        return next;
      });
    } catch {
      toast.error('No se pudo asignar la variante');
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors',
          dragActive
            ? 'border-tradealo-primary bg-tradealo-primary-light'
            : 'border-tradealo-border bg-white',
          !canAdd && 'opacity-50 pointer-events-none'
        )}
      >
        <UploadCloud className="text-tradealo-primary mb-2" size={28} />
        <p className="font-medium text-sm">
          Arrastrá tus fotos o hacé click para subirlas
        </p>
        <p className="text-xs text-tradealo-text-muted mt-1">
          JPG, PNG, WebP, GIF, AVIF, TIFF o SVG — hasta {maxImages} imágenes — máx. 5MB c/u
        </p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={onPick}
          disabled={!canAdd}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        {uploading > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-tradealo-primary">
            <Loader2 className="animate-spin" size={14} />
            Subiendo {uploading} {uploading === 1 ? 'imagen' : 'imágenes'}…
          </div>
        )}
      </div>

      {imgs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {imgs.map((img, idx) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => setDraggingId(img.id)}
              onDragOver={(e) => {
                e.preventDefault();
                reorder(img.id);
              }}
              onDragEnd={() => setDraggingId(null)}
              className={cn(
                'flex flex-col',
                draggingId === img.id && 'opacity-50'
              )}
            >
            <div className="relative group aspect-square rounded-lg overflow-hidden border border-tradealo-border bg-gray-100 cursor-move">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={`Imagen ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {idx === 0 && (
                <span className="absolute top-1.5 left-1.5 bg-tradealo-primary text-white text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded">
                  Portada
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  remove(img.id);
                }}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                aria-label="Eliminar imagen"
              >
                <X size={12} />
              </button>
            </div>
            {variants && variants.length > 0 && (
              <select
                value={img.variantId ?? ''}
                onChange={(e) => handleAssignVariant(img.id, e.target.value || null)}
                onClick={(e) => e.stopPropagation()}
                className="w-full mt-1 text-[11px] rounded border border-tradealo-border px-1 py-0.5 bg-white focus:outline-none focus:border-tradealo-primary truncate"
              >
                <option value="">Todas las variantes</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {variantLabel(v)}
                  </option>
                ))}
              </select>
            )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
