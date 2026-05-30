'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Star, FileCheck, AlertTriangle, CheckCircle2, XCircle, Clock, Building2, Bug, ChevronDown, ChevronUp, Smartphone } from 'lucide-react';
import { kyc, auth } from '@/lib/api';
import type { BcraCheckResult, BcraPeriodo } from '@/types';
import { KycProgress } from '@/components/kyc/KycProgress';
import { KycStepCard } from '@/components/kyc/KycStepCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TierBadge } from '@/components/ui/TierBadge';
import { useAuthStore, toast } from '@/lib/store';
import dynamic from 'next/dynamic';

const PhoneAuthModal = dynamic(
  () => import('@/components/auth/PhoneAuthModal').then((m) => ({ default: m.PhoneAuthModal })),
  { ssr: false, loading: () => null },
);

type KycStepStatus = 'pending' | 'verified' | 'rejected';

const SITUACION_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: 'Normal', color: 'text-green-700' },
  2: { label: 'Seguimiento especial', color: 'text-yellow-700' },
  3: { label: 'Con problemas', color: 'text-orange-700' },
  4: { label: 'Alto riesgo de insolvencia', color: 'text-red-600' },
  5: { label: 'Irrecuperable', color: 'text-red-800' },
  6: { label: 'Irrecuperable (técnica)', color: 'text-red-900' },
};

function formatCuit(cuit: string) {
  const c = cuit.replace(/\D/g, '');
  if (c.length === 11) return `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}`;
  return cuit;
}

function formatPeriodo(p: string) {
  if (p.length === 6) return `${p.slice(4, 6)}/${p.slice(0, 4)}`;
  return p;
}

function BcraResultCard({ result }: { result: BcraCheckResult }) {
  const raw = result.rawResponse;
  const periodos: BcraPeriodo[] = raw?.periodos ?? [];

  const statusConfig = {
    passed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Aprobado' },
    flagged: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'En revisión' },
    error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Error' },
  }[result.status] ?? { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', label: 'Pendiente' };

  const StatusIcon = statusConfig.icon;

  return (
    <Card>
      <CardBody className="space-y-4">
        {/* Header */}
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${statusConfig.bg}`}>
          <StatusIcon size={22} className={`${statusConfig.color} shrink-0`} />
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm ${statusConfig.color}`}>{statusConfig.label}</p>
            {result.summary && <p className="text-xs text-gray-600 mt-0.5">{result.summary}</p>}
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {raw?.cuit && (
            <div>
              <p className="text-xs text-tradealo-text-muted font-medium uppercase tracking-wide">CUIT</p>
              <p className="font-mono font-semibold mt-0.5">{formatCuit(raw.cuit)}</p>
            </div>
          )}
          {raw?.denominacion && (
            <div>
              <p className="text-xs text-tradealo-text-muted font-medium uppercase tracking-wide">Titular</p>
              <p className="font-semibold mt-0.5">{raw.denominacion}</p>
            </div>
          )}
          {raw?.totalDebtARS !== undefined && raw.totalDebtARS > 0 && (
            <div>
              <p className="text-xs text-tradealo-text-muted font-medium uppercase tracking-wide">Deuda total</p>
              <p className="font-semibold mt-0.5">${raw.totalDebtARS.toLocaleString('es-AR')} ARS</p>
            </div>
          )}
          {result.checkedAt && (
            <div>
              <p className="text-xs text-tradealo-text-muted font-medium uppercase tracking-wide">Consultado</p>
              <p className="font-semibold mt-0.5">{new Date(result.checkedAt).toLocaleDateString('es-AR')}</p>
            </div>
          )}
        </div>

        {/* Periodos / Entidades */}
        {periodos.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-tradealo-text-muted uppercase tracking-wide">Detalle por entidad</p>
            {periodos.map((periodo) => (
              <div key={periodo.periodo}>
                <p className="text-xs text-tradealo-text-muted mb-2">Período {formatPeriodo(periodo.periodo)}</p>
                <div className="space-y-2">
                  {periodo.entidades.map((ent, i) => {
                    const sit = SITUACION_LABEL[ent.situacion] ?? { label: `Situación ${ent.situacion}`, color: 'text-gray-700' };
                    return (
                      <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <Building2 size={14} className="text-gray-500 shrink-0" />
                            <span className="font-medium text-sm truncate">{ent.entidad}</span>
                          </div>
                          <span className={`text-xs font-semibold ${sit.color}`}>
                            Sit. {ent.situacion} — {sit.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-tradealo-text-muted pl-5">
                          {ent.monto !== undefined && (
                            <span>Monto: <span className="font-medium text-tradealo-text">${((ent.monto ?? 0) * 1000).toLocaleString('es-AR')}</span></span>
                          )}
                          {ent.diasAtrasoPago !== undefined && (
                            <span>Atraso: <span className="font-medium text-tradealo-text">{ent.diasAtrasoPago} días</span></span>
                          )}
                          {ent.procesoJud && <span className="text-red-600 font-semibold">⚠ Proceso judicial</span>}
                          {ent.situacionJuridica && <span className="text-red-600 font-semibold">⚠ Situación jurídica</span>}
                          {ent.refinanciaciones && <span className="text-amber-600">Refinanciación activa</span>}
                          {ent.enRevision && <span className="text-amber-600">En revisión</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {raw?.noRecords && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            No se encontraron deudas registradas en el BCRA para este CUIT.
          </p>
        )}

        {result.expiresAt && (
          <p className="text-xs text-tradealo-text-muted">
            Consulta válida hasta {new Date(result.expiresAt).toLocaleDateString('es-AR')}
          </p>
        )}
      </CardBody>
    </Card>
  );
}

export default function KycPage() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const [bcraLoading, setBcraLoading] = useState(false);
  const [goldLoading, setGoldLoading] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ['kyc-status'],
    queryFn: () => kyc.getKycStatus(),
    enabled: initialized && !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d) return false;
      const allDone = d.phoneCamera && d.selfie && d.bcraConsent && d.phoneVerified;
      return allDone ? false : 30_000;
    },
  });

  const { data: tiers } = useQuery({
    queryKey: ['kyc-tiers'],
    queryFn: () => kyc.getTierProgress(),
    enabled: initialized && !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d) return false;
      return d.silver.granted && d.gold.granted ? false : 60_000;
    },
  });

  // BCRA: solo se fetchea DESPUÉS de que el usuario dio consentimiento.
  // Una vez dado, polleamos cada 8s brevemente mientras el backend hace
  // el fetch async al BCRA, y paramos en cuanto llega el resultado.
  const { data: bcraResult, refetch: refetchBcra } = useQuery({
    queryKey: ['kyc-bcra-result'],
    queryFn: () => kyc.getBcraResult(),
    enabled: initialized && !!user && status?.bcraConsent === true,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => (query.state.data ? false : 8_000),
  });

  const { data: debugInfo, refetch: refetchDebug, isFetching: debugFetching } = useQuery({
    queryKey: ['kyc-debug'],
    queryFn: () => kyc.getDebugInfo(),
    enabled: debugOpen,
    staleTime: 0,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['kyc-status'] });
    queryClient.invalidateQueries({ queryKey: ['kyc-tiers'] });
  };

  const handlePhoneVerified = async (idToken: string) => {
    const res = await auth.phoneLink(idToken);
    toast.success(`Celular ${res.phone} verificado`);
    if (user) setUser({ ...user, phone: res.phone, phoneVerified: res.phoneVerified });
    queryClient.invalidateQueries({ queryKey: ['kyc-status'] });
    queryClient.invalidateQueries({ queryKey: ['kyc-tiers'] });
  };

  const handleBcraConsent = async () => {
    if (!status?.phoneCamera) {
      toast.error('Primero tenés que cargar las fotos del DNI y que sean reconocidas.');
      return;
    }
    setBcraLoading(true);
    try {
      await kyc.recordBcraConsent('granted');
      refresh();
      void refetchBcra();
    } finally {
      setBcraLoading(false);
    }
  };

  const handleGoldUpgrade = async () => {
    setGoldLoading(true);
    try {
      await kyc.recalculateTier();
      refresh();
    } finally {
      setGoldLoading(false);
    }
  };

  const stepStatus = (done: boolean): KycStepStatus =>
    done ? 'verified' : 'pending';

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6 overflow-x-hidden">
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

        <PhoneAuthModal
          open={phoneModalOpen}
          onClose={() => setPhoneModalOpen(false)}
          onVerified={handlePhoneVerified}
          mode="link"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Celular — paso 1 */}
          <div className="bg-white rounded-2xl border border-tradealo-border p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-lg bg-tradealo-primary-light flex items-center justify-center text-tradealo-primary">
                <Smartphone size={20} />
              </div>
              <Badge variant={status?.phoneVerified ? 'success' : 'warning'}>
                {status?.phoneVerified ? 'Verificado' : 'Pendiente'}
              </Badge>
            </div>
            <div>
              <h4 className="font-heading font-semibold">Celular verificado</h4>
              <p className="text-sm text-tradealo-text-muted mt-0.5">
                Verificá tu número con un código SMS. Solo para seguridad de tu cuenta.
              </p>
            </div>
            <div className="mt-auto pt-2">
              {status?.phoneVerified ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200">
                  <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-700 text-sm leading-tight">Verificado</p>
                    <p className="text-xs text-green-600 mt-0.5 break-all">{status.phone}</p>
                  </div>
                </div>
              ) : (
                <Button fullWidth onClick={() => setPhoneModalOpen(true)}>
                  Verificar celular
                </Button>
              )}
            </div>
          </div>

          <KycStepCard
            type="phone_camera"
            status={stepStatus(status?.phoneCamera ?? false)}
            onUploaded={refresh}
          />
          <KycStepCard
            type="selfie"
            status={stepStatus(status?.selfie ?? false)}
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
                <Button fullWidth type="button" onClick={handleBcraConsent} disabled={bcraLoading}>
                  {bcraLoading ? 'Procesando...' : 'Dar consentimiento'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BCRA Result */}
      {bcraResult && <BcraResultCard result={bcraResult} />}

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
                  <Button fullWidth className="mt-3" onClick={handleGoldUpgrade} disabled={goldLoading}>
                    {goldLoading ? 'Procesando...' : 'Actualizar a Gold'}
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Debug panel — tap to expand, shows raw validation state */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => { setDebugOpen(v => !v); if (!debugOpen) void refetchDebug(); }}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-left"
        >
          <span className="flex items-center gap-2 text-sm text-gray-500 font-medium">
            <Bug size={15} />
            Debug — estado de validación
          </span>
          {debugOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
        </button>
        {debugOpen && (
          <div className="p-4 space-y-3 bg-white text-xs font-mono">
            {debugFetching && <p className="text-gray-400">Cargando…</p>}
            {debugInfo && (
              <>
                <div>
                  <p className="text-gray-500 font-sans font-semibold mb-1">Vision Provider</p>
                  <pre className="bg-gray-50 rounded-lg p-2 whitespace-pre-wrap break-all overflow-x-auto">{JSON.stringify(debugInfo.visionProvider, null, 2)}</pre>
                </div>
                <div>
                  <p className="text-gray-500 font-sans font-semibold mb-1">Verificaciones ({debugInfo.verifications.length})</p>
                  {debugInfo.verifications.length === 0 && <p className="text-gray-400">Sin registros</p>}
                  {debugInfo.verifications.map((v, i) => (
                    <pre key={i} className="bg-gray-50 rounded-lg p-2 mb-2 whitespace-pre-wrap break-all overflow-x-auto">{JSON.stringify(v, null, 2)}</pre>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void refetchDebug()}
                  className="text-tradealo-primary underline font-sans"
                >
                  Actualizar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
