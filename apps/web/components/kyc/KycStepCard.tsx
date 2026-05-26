'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  CreditCard,
  ScanFace,
  Home,
  Camera,
  CheckCircle2,
  AlertCircle,
  Upload,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { kyc as kycApi } from '@/lib/api';
import { toast } from '@/lib/store';
import { DniCameraCapture } from './DniCameraCapture';

type KycType = 'id' | 'selfie' | 'address' | 'phone_camera';
type KycStepStatus = 'pending' | 'verified' | 'rejected';

interface Props {
  type: KycType;
  status: KycStepStatus;
  onUploaded?: () => void;
}

const META: Record<
  KycType,
  {
    title: string;
    description: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: React.ComponentType<any>;
  }
> = {
  id: {
    title: 'Documento de identidad',
    description: 'Subí una foto del frente y dorso de tu DNI argentino.',
    icon: CreditCard,
  },
  selfie: {
    title: 'Selfie con DNI',
    description: 'Foto sosteniendo tu DNI cerca de tu rostro, en buena luz.',
    icon: ScanFace,
  },
  address: {
    title: 'Comprobante de domicilio',
    description: 'Factura de servicio reciente (luz, gas, internet) a tu nombre.',
    icon: Home,
  },
  phone_camera: {
    title: 'Validación con celular',
    description: 'Fotos del frente y dorso de tu DNI tomadas con la cámara.',
    icon: Camera,
  },
};

const STATUS_BADGE: Record<
  KycStepStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'danger' }
> = {
  pending: { label: 'Pendiente', variant: 'warning' },
  verified: { label: 'Verificado', variant: 'success' },
  rejected: { label: 'Rechazado', variant: 'danger' },
};

async function fileToBase64(file: File): Promise<{ base64: string; mimetype: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({
        base64: result.split(',')[1],
        mimetype: file.type || 'application/octet-stream',
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function KycStepCard({ type, status, onUploaded }: Props) {
  const meta = META[type];
  const Icon = meta.icon;
  const badge = STATUS_BADGE[status];
  const [loading, setLoading] = useState(false);
  const [frontDone, setFrontDone] = useState(false);
  const [backDone, setBackDone] = useState(false);
  const [cameraOpen, setCameraOpen] = useState<'front' | 'back' | null>(null);
  const [validating, setValidating] = useState(false);

  // Clear validating state when status resolves (verified or rejected)
  useEffect(() => {
    if (status !== 'pending') setValidating(false);
  }, [status]);
  const singleRef = useRef<HTMLInputElement>(null);
  const frontData = useRef<{ base64: string; mimetype: string } | null>(null);
  const backData = useRef<{ base64: string; mimetype: string } | null>(null);

  const handleSingle = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El documento no puede superar 5 MB');
      e.target.value = '';
      return;
    }
    setLoading(true);
    try {
      const { base64, mimetype } = await fileToBase64(file);
      if (type === 'selfie') await kycApi.uploadSelfie(base64, mimetype);
      else if (type === 'address') await kycApi.uploadAddress(base64, mimetype);
      toast.success('Documento subido. Te avisaremos cuando se verifique.');
      onUploaded?.();
    } catch (err) {
      const axiosMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const msg = axiosMsg ?? (err instanceof Error ? err.message : String(err));
      toast.error(`Error: ${msg}`);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleCameraCapture = async (base64: string, mimetype: string) => {
    const side = cameraOpen;
    setCameraOpen(null);
    if (side === 'front') {
      frontData.current = { base64, mimetype };
      setFrontDone(true);
    } else {
      backData.current = { base64, mimetype };
      setBackDone(true);
    }
    // upload when both sides are ready
    const front = side === 'front' ? { base64, mimetype } : frontData.current;
    const back = side === 'back' ? { base64, mimetype } : backData.current;
    if (front && back) {
      setLoading(true);
      try {
        await kycApi.uploadPhoneCamera(front.base64, front.mimetype, back.base64, back.mimetype);
        setFrontDone(false);
        setBackDone(false);
        setValidating(true);
        frontData.current = null;
        backData.current = null;
        onUploaded?.();
      } catch (err) {
        const axiosMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        const msg = axiosMsg ?? (err instanceof Error ? err.message : String(err));
        toast.error(`Error al subir: ${msg}`);
        setFrontDone(false);
        setBackDone(false);
        frontData.current = null;
        backData.current = null;
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      {cameraOpen && (
        <DniCameraCapture
          side={cameraOpen}
          onCapture={handleCameraCapture}
          onClose={() => setCameraOpen(null)}
        />
      )}
    <div className="bg-white rounded-2xl border border-tradealo-border p-5 flex flex-col gap-3">
      {/* Hidden file input for single-upload types */}
      {type !== 'phone_camera' && (
        <input
          ref={singleRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleSingle}
          className="hidden"
        />
      )}

      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-lg bg-tradealo-primary-light flex items-center justify-center text-tradealo-primary">
          <Icon size={20} />
        </div>
        <Badge variant={badge.variant}>
          {status === 'verified' && <CheckCircle2 size={11} />}
          {status === 'rejected' && <AlertCircle size={11} />}
          {badge.label}
        </Badge>
      </div>
      <div>
        <h4 className="font-heading font-semibold">{meta.title}</h4>
        <p className="text-sm text-tradealo-text-muted mt-0.5">
          {meta.description}
        </p>
      </div>
      <div className="mt-auto pt-2 space-y-2">
        {status === 'verified' ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200">
            <CheckCircle2 size={22} className="text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-700 text-sm leading-tight">Completado</p>
              <p className="text-xs text-green-600 mt-0.5">Verificado exitosamente</p>
            </div>
          </div>
        ) : type === 'phone_camera' ? (
          <>
            {validating ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
                <Loader2 size={18} className="text-blue-500 shrink-0 animate-spin" />
                <div>
                  <p className="font-semibold text-blue-700 text-sm leading-tight">Validando con IA…</p>
                  <p className="text-xs text-blue-600 mt-0.5">Puede demorar unos segundos</p>
                </div>
              </div>
            ) : (
              <>
                <Button
                  fullWidth
                  variant={frontDone ? 'ghost' : status === 'rejected' ? 'danger' : 'primary'}
                  leftIcon={frontDone ? <CheckCircle2 size={15} /> : <Camera size={15} />}
                  type="button"
                  disabled={loading}
                  onClick={() => setCameraOpen('front')}
                >
                  {frontDone ? 'Frente listo' : status === 'rejected' ? 'Volver a intentar frente' : 'Foto frente'}
                </Button>
                <Button
                  fullWidth
                  variant={backDone ? 'ghost' : 'primary'}
                  leftIcon={backDone ? <CheckCircle2 size={15} /> : <Camera size={15} />}
                  type="button"
                  disabled={loading}
                  onClick={() => setCameraOpen('back')}
                >
                  {backDone ? 'Dorso listo' : 'Foto dorso'}
                </Button>
                {(frontDone || backDone) && !loading && (
                  <p className="text-xs text-tradealo-text-muted text-center">
                    {frontDone && backDone ? 'Enviando…' : 'Tomá ambas fotos para continuar'}
                  </p>
                )}
              </>
            )}
          </>
        ) : (
          <Button
            fullWidth
            variant={status === 'rejected' ? 'danger' : 'primary'}
            loading={loading}
            leftIcon={<Upload size={15} />}
            type="button"
            onClick={() => singleRef.current?.click()}
          >
            {status === 'rejected'
              ? 'Volver a intentarlo'
              : 'Subir documento'}
          </Button>
        )}
      </div>
    </div>
  </>
  );
}
