'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Repeat } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore, toast } from '@/lib/store';
import { auth } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const initialize = useAuthStore((s) => s.initialize);
  const setUser = useAuthStore((s) => s.setUser);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    if (initialized && user) {
      router.replace('/dashboard');
    }
  }, [initialized, user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await auth.login(values);
      setUser(res.user);
      setInitialized(true);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error al iniciar sesión';
      toast.error(msg);
    }
  };

  if (initialized && user) return null;

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
              Bienvenido de nuevo
            </h1>
            <p className="text-sm text-tradealo-text-muted mt-1">
              Ingresá a tu cuenta para continuar
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
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
              autoComplete="current-password"
            />
            <div className="flex justify-end">
              <Link
                href="/reset-password"
                className="text-xs text-tradealo-primary hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Button type="submit" fullWidth loading={isSubmitting} size="lg">
              Ingresar
            </Button>
          </form>

          <div className="text-center text-sm text-tradealo-text-muted">
            ¿No tenés cuenta?{' '}
            <Link
              href="/register"
              className="text-tradealo-primary font-medium hover:underline"
            >
              Registrate
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
