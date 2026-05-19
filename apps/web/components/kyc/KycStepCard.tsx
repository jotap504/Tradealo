'use client';

import { ChangeEvent, useRef, useState } from 'react';
import {
  CreditCard,
  ScanFace,
  Home,
  Camera,
  CheckCircle2,
  AlertCircle,
  Upload,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { kyc as kycApi } from '@/lib/api';
import { toast } from '@/lib/store';

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
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
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

  const handleFront = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El documento no puede superar 5 MB');
      e.target.value = '';
      return;
    }
    const data = await fileToBase64(file);
    frontData.current = data;
    setFrontDone(true);
    e.target.value = '';
    if (backData.current) {
      await doPhoneCameraUpload();
    }
  };

  const handleBack = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El documento no puede superar 5 MB');
      e.target.value = '';
      return;
    }
    const data = await fileToBase64(file);
    backData.current = data;
    setBackDone(true);
    e.target.value = '';
    if (frontData.current) {
      await doPhoneCameraUpload();
    }
  };

  const doPhoneCameraUpload = async () => {
    if (!frontData.current || !backData.current) return;
    setLoading(true);
    try {
      await kycApi.uploadPhoneCamera(
        frontData.current.base64,
        frontData.current.mimetype,
        backData.current.base64,
        backData.current.mimetype,
      );
      toast.success('Documentos subidos. En segundos te confirmamos si son válidos.');
      onUploaded?.();
      frontData.current = null;
      backData.current = null;
    } catch (err) {
      const axiosMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const msg = axiosMsg ?? (err instanceof Error ? err.message : String(err));
      toast.error(`Error: ${msg}`);
      setFrontDone(false);
      setBackDone(false);
      frontData.current = null;
      backData.current = null;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-tradealo-border p-5 flex flex-col gap-3">
      {/* Hidden file inputs for phone_camera dual mode */}
      {type === 'phone_camera' && (
        <>
          <input
            ref={frontRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFront}
            className="hidden"
          />
          <input
            ref={backRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleBack}
            className="hidden"
          />
        </>
      )}

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
          <Button variant="ghost" fullWidth disabled>
            Documento verificado
          </Button>
        ) : type === 'phone_camera' ? (
          <>
            <Button
              fullWidth
              variant={frontDone ? 'ghost' : status === 'rejected' ? 'danger' : 'primary'}
              leftIcon={frontDone ? <CheckCircle2 size={15} /> : <Camera size={15} />}
              type="button"
              disabled={loading}
              onClick={() => frontRef.current?.click()}
            >
              {frontDone ? 'Frente listo' : 'Foto frente'}
            </Button>
            <Button
              fullWidth
              variant={backDone ? 'ghost' : 'primary'}
              leftIcon={backDone ? <CheckCircle2 size={15} /> : <Camera size={15} />}
              type="button"
              disabled={loading}
              onClick={() => backRef.current?.click()}
            >
              {backDone ? 'Dorso listo' : 'Foto dorso'}
            </Button>
            {(frontDone || backDone) && !loading && (
              <p className="text-xs text-tradealo-text-muted text-center">
                {frontDone && backDone
                  ? 'Subiendo...'
                  : 'Tomá ambas fotos para continuar'}
              </p>
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
  );
}
