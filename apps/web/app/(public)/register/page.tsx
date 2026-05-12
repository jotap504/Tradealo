'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Repeat } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/store';
import { auth } from '@/lib/api';

const schema = z
  .object({
    email: z.string().email('Email inválido'),
    username: z
      .string()
      .min(3, 'Mínimo 3 caracteres')
      .max(30, 'Máximo 30 caracteres')
      .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/\d/, 'Debe contener al menos un número'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await auth.register({
        email: values.email,
        username: values.username,
        password: values.password,
      });
      toast.success('¡Cuenta creada! Verificá tu email para continuar.');
      router.push('/login');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error al crear la cuenta';
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-12">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-6 p-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-10 h-10 rounded-xl bg-tradealo-primary flex items-center justify-center text-white shadow-sm">
                <Repeat size={20} strokeWidth={2.5} />
              </span>
              <span className="font-heading font-bold text-2xl text-tradealo-primary">
                Tradealo
              </span>
            </div>
            <h1 className="font-heading text-xl font-bold text-tradealo-text mt-3">
              Crear cuenta
            </h1>
            <p className="text-sm text-tradealo-text-muted mt-1">
              Publicá gratis tu primera publicación
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              {...register('email')}
              error={errors.email?.message}
              autoComplete="email"
            />
            <Input
              label="Nombre de usuario"
              placeholder="mi_usuario"
              {...register('username')}
              error={errors.username?.message}
              autoComplete="username"
              helper="Solo letras, números y guiones bajos"
              showCount
              minLength={3}
              maxLength={30}
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="Ej: MiClave123"
              {...register('password')}
              error={errors.password?.message}
              autoComplete="new-password"
              helper="Mínimo 8 caracteres, una mayúscula y un número"
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              placeholder="Repetí tu contraseña"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
            />
            <Button type="submit" fullWidth loading={isSubmitting} size="lg">
              Crear cuenta
            </Button>
          </form>

          <div className="text-center text-sm text-tradealo-text-muted">
            ¿Ya tenés cuenta?{' '}
            <Link
              href="/login"
              className="text-tradealo-primary font-medium hover:underline"
            >
              Iniciá sesión
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
