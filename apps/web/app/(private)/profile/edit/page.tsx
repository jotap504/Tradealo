'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera } from 'lucide-react';
import { useAuthStore, toast } from '@/lib/store';
import { users } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ProvinceSelector } from '@/components/ui/ProvinceSelector';
import { Card, CardBody } from '@/components/ui/Card';

const schema = z.object({
  username: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(30, 'Máximo 30 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos'),
  bio: z.string().max(300, 'Máximo 300 caracteres').optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  cbu: z.string().max(22).optional(),
  alias: z.string().max(50).optional(),
  bankName: z.string().max(100).optional(),
  bankAccountType: z.string().max(30).optional(),
  bankAccountNumber: z.string().max(30).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function EditProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (user) {
      reset({
        username: user.username ?? '',
        bio: user.bio ?? '',
        province: user.province ?? '',
        city: user.city ?? '',
        cbu: user.cbu ?? '',
        alias: user.alias ?? '',
        bankName: user.bankName ?? '',
        bankAccountType: user.bankAccountType ?? '',
        bankAccountNumber: user.bankAccountNumber ?? '',
      });
    }
  }, [user, reset]);

  const bioValue = watch('bio') ?? '';
  const usernameValue = watch('username') ?? '';

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      const result = await new Promise<{ base64: string; mimetype: string }>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve({
            base64: result.split(',')[1],
            mimetype: file.type || 'image/jpeg',
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await users.uploadAvatar(result.base64, result.mimetype);
      setUser({ ...user!, avatarUrl: res.avatarUrl });
      toast.success('Avatar actualizado');
    } catch {
      toast.error('No se pudo subir el avatar');
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const updated = await users.updateProfile({
        username: values.username,
        bio: values.bio,
        province: values.province,
        city: values.city,
        cbu: values.cbu || undefined,
        alias: values.alias || undefined,
        bankName: values.bankName || undefined,
        bankAccountType: values.bankAccountType || undefined,
        bankAccountNumber: values.bankAccountNumber || undefined,
      });
      setUser(updated);
      toast.success('Perfil actualizado');
      router.push('/profile');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'No se pudo actualizar el perfil';
      toast.error(msg);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-8 space-y-6">
      <h1 className="font-heading text-2xl font-bold text-tradealo-text">
        Editar perfil
      </h1>

      <Card>
        <CardBody className="p-6 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar
                src={avatarPreview ?? user.avatarUrl}
                username={user.username ?? user.email}
                size="xl"
              />
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-tradealo-primary text-white flex items-center justify-center hover:bg-tradealo-primary-hover shadow-sm"
                aria-label="Cambiar avatar"
              >
                <Camera size={14} />
              </button>
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <p className="text-xs text-tradealo-text-muted">
              Hacé clic en el ícono para cambiar tu foto
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nombre de usuario"
              placeholder="mi_usuario"
              {...register('username')}
              value={usernameValue}
              error={errors.username?.message}
              helper="Solo letras, números y guiones bajos"
              showCount
              minLength={3}
              maxLength={30}
            />
            <Textarea
              label="Sobre mí (opcional)"
              placeholder="Contá algo sobre vos…"
              rows={4}
              {...register('bio')}
              value={bioValue}
              error={errors.bio?.message}
              showCount
              maxLength={300}
            />
            <ProvinceSelector label="Provincia" {...register('province')} />
            <Input
              label="Ciudad"
              placeholder="Ej: Rosario"
              {...register('city')}
              error={errors.city?.message}
            />

            {/* Payment info section */}
            <div className="border-t border-tradealo-border pt-6">
              <h2 className="font-heading text-lg font-semibold text-tradealo-text mb-1">
                Datos de pago para ventas
              </h2>
              <p className="text-sm text-tradealo-text-muted mb-4">
                Estos datos se compartirán automáticamente con el comprador al vender un producto con stock.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="CBU"
                  placeholder="0000000000000000000000"
                  maxLength={22}
                  {...register('cbu')}
                  error={errors.cbu?.message}
                />
                <Input
                  label="Alias"
                  placeholder="mi.alias.de.cbu"
                  maxLength={50}
                  {...register('alias')}
                  error={errors.alias?.message}
                />
                <Input
                  label="Banco"
                  placeholder="Ej: Banco Nación"
                  maxLength={100}
                  {...register('bankName')}
                  error={errors.bankName?.message}
                />
                <Input
                  label="Tipo de cuenta"
                  placeholder="corriente / caja de ahorro"
                  maxLength={30}
                  {...register('bankAccountType')}
                  error={errors.bankAccountType?.message}
                />
                <Input
                  label="Número de cuenta"
                  placeholder="Ej: 123456789"
                  maxLength={30}
                  {...register('bankAccountNumber')}
                  error={errors.bankAccountNumber?.message}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => router.push('/profile')}
              >
                Cancelar
              </Button>
              <Button type="submit" fullWidth loading={isSubmitting}>
                Guardar cambios
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
