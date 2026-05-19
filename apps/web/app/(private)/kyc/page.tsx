'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ShieldCheck, Star, FileCheck } from 'lucide-react';
import { kyc } from '@/lib/api';
import { KycProgress } from '@/components/kyc/KycProgress';
import { KycStepCard } from '@/components/kyc/KycStepCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TierBadge } from '@/components/ui/TierBadge';

type KycStepStatus = 'pending' | 'verified' | 'rejected';

export default function KycPage() {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['kyc-status'],
    queryFn: () => kyc.getKycStatus(),
    staleTime: 60_000,
  });

  const { data: tiers } = useQuery({
    queryKey: ['kyc-tiers'],
    queryFn: () => kyc.getTierProgress(),
    staleTime: 30_000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['kyc-status'] });
    queryClient.invalidateQueries({ queryKey: ['kyc-tiers'] });
  };

  const stepStatus = (done: boolean): KycStepStatus =>
    done ? 'verified' : 'pending';

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-tradealo-text">
          Verificación de identidad
        </h1>
        <p className="text-sm text-tradealo-text-muted mt-1">
          Completá los pasos para desbloquear más funcionalidades en Tradealo.
        </p>
      </div>

      {isLoading ? (
        <Skeleton variant="card" className="h-40" />
      ) : status ? (
        <KycProgress status={status} />
      ) : null}

      {/* Current Tier Banner */}
      {tiers && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-tradealo-primary-light flex items-center justify-center text-tradealo-primary">
                <ShieldCheck size={22} />
              </div>
              <div className="flex-1">
                <p className="font-heading font-semibold text-base flex items-center gap-2">
                  Nivel actual
                  <TierBadge level={tiers.currentTier} showLabel />
                </p>
                <p className="text-sm text-tradealo-text-muted">
                  {tiers.currentTier === 0 && 'Sin verificar'}
                  {tiers.currentTier === 1 && 'Identidad verificada — Silver'}
                  {tiers.currentTier >= 2 && 'Usuario Gold — máxima confianza'}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Silver Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={18} className="text-tradealo-primary" />
          <h2 className="font-heading font-semibold text-lg">Silver</h2>
          {tiers?.silver.granted && (
            <Badge variant="success">Completado</Badge>
          )}
        </div>

        {tiers && (
          <p className="text-sm text-tradealo-text-muted mb-4">
            Pasos completados: {tiers.silver.stepsCompleted} /{' '}
            {tiers.silver.stepsTotal}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KycStepCard
            type="id"
            status={stepStatus(status?.id ?? false)}
            onUploaded={refresh}
          />
          <KycStepCard
            type="selfie"
            status={stepStatus(status?.selfie ?? false)}
            onUploaded={refresh}
          />
          <KycStepCard
            type="phone_camera"
            status={stepStatus(status?.phoneCamera ?? false)}
            onUploaded={refresh}
          />
          <div className="bg-white rounded-2xl border border-tradealo-border p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-lg bg-tradealo-primary-light flex items-center justify-center text-tradealo-primary">
                <FileCheck size={20} />
              </div>
              <Badge variant={status?.bcraConsent ? 'success' : 'warning'}>
                {status?.bcraConsent ? 'Autorizado' : 'Pendiente'}
              </Badge>
            </div>
            <div>
              <h4 className="font-heading font-semibold">
                Estudio crediticio BCRA
              </h4>
              <p className="text-sm text-tradealo-text-muted mt-0.5">
                Autorizá a Tradealo a consultar tu información crediticia en el
                BCRA.
              </p>
            </div>
            <div className="mt-auto pt-2">
              {status?.bcraConsent ? (
                <Button variant="ghost" fullWidth disabled>
                  Consentimiento otorgado
                </Button>
              ) : (
                <Button fullWidth type="button">
                  Dar consentimiento
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {tiers?.silver.granted && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star size={18} className="text-amber-500" />
            <h2 className="font-heading font-semibold text-lg">Gold</h2>
            {tiers.gold.granted && <Badge variant="success">Activo</Badge>}
          </div>

          <Card>
            <CardBody>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                  <Star size={22} className="fill-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="font-heading font-semibold text-base">
                    {tiers.gold.eligible
                      ? '¡Podés obtener Gold!'
                      : 'Progreso hacia Gold'}
                  </p>
                  <p className="text-sm text-tradealo-text-muted mt-0.5">
                    {tiers.gold.eligible
                      ? 'Solicitá la actualización a Gold desde acá.'
                      : tiers.gold.progress.reason}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-tradealo-text-muted">
                    Calificaciones totales
                  </span>
                  <span className="font-medium">
                    {tiers.gold.progress.totalReviews} / 50
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (tiers.gold.progress.totalReviews / 50) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-tradealo-text-muted">
                    Calificaciones positivas
                  </span>
                  <span className="font-medium">
                    {tiers.gold.progress.positiveReviews}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-tradealo-text-muted">
                    Calificaciones negativas (1 estrella)
                  </span>
                  <span className="font-medium">
                    {tiers.gold.progress.badReviews} (
                    {tiers.gold.progress.badPct}%)
                  </span>
                </div>
                {tiers.gold.eligible && !tiers.gold.granted && (
                  <Button fullWidth className="mt-3">
                    Actualizar a Gold
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
