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
import { API_URL } from '@/lib/constants';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
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

          <a
            href={`${API_URL}/auth/google`}
            className="flex items-center justify-center gap-3 w-full rounded-xl border border-tradealo-border bg-white px-4 py-2.5 text-sm font-medium text-tradealo-text shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </a>

          <div className="relative flex items-center">
            <div className="flex-1 border-t border-tradealo-border" />
            <span className="mx-3 text-xs text-tradealo-text-muted">o</span>
            <div className="flex-1 border-t border-tradealo-border" />
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
