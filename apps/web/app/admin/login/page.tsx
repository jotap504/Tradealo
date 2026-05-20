'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { useAuthStore, toast } from '@/lib/store';
import { auth } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type FormValues = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const setUser = useAuthStore((s) => s.setUser);

  const ADMIN_ROLES = ['super_admin', 'partner', 'finance', 'support', 'moderator'];

  useEffect(() => {
    if (initialized && user && ADMIN_ROLES.includes(user.role ?? '')) {
      router.replace('/admin');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await auth.login(values);
      if (!ADMIN_ROLES.includes(res.user.role ?? '')) {
        toast.error('Acceso denegado. No tenés permisos de administrador.');
        return;
      }
      setUser(res.user);
      router.push('/admin');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Credenciales incorrectas';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-6 p-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center text-tradealo-primary mx-auto mb-4">
              <ShieldCheck size={28} />
            </div>
            <h1 className="font-heading text-xl font-bold text-tradealo-text">
              Acceso Administrativo
            </h1>
            <p className="text-sm text-tradealo-text-muted mt-1">
              Solo para administradores autorizados
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="admin@trocalia.com.ar"
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
              Ingresar al panel
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
