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
    description: 'Foto de tu DNI tomada con la cámara del celular.',
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

export function KycStepCard({ type, status, onUploaded }: Props) {
  const meta = META[type];
  const Icon = meta.icon;
  const badge = STATUS_BADGE[status];
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El documento no puede superar 5 MB');
      e.target.value = '';
      return;
    }
    setLoading(true);
    try {
      const reader = new FileReader();
      const { base64, mimetype } = await new Promise<{ base64: string; mimetype: string }>((resolve, reject) => {
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
      if (type === 'id') await kycApi.uploadId(base64, mimetype);
      else if (type === 'selfie') await kycApi.uploadSelfie(base64, mimetype);
      else if (type === 'address') await kycApi.uploadAddress(base64, mimetype);
      else if (type === 'phone_camera') await kycApi.uploadPhoneCamera(base64, mimetype);
      toast.success('Documento subido. Te avisaremos cuando se verifique.');
      onUploaded?.();
    } catch {
      toast.error('Falló la subida. Probá de nuevo.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-tradealo-border p-5 flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handle}
        className="hidden"
      />
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
      <div className="mt-auto pt-2">
        {status === 'verified' ? (
          <Button variant="ghost" fullWidth disabled>
            Documento verificado
          </Button>
        ) : (
          <Button
            fullWidth
            variant={status === 'rejected' ? 'danger' : 'primary'}
            loading={loading}
            leftIcon={<Upload size={15} />}
            type="button"
            onClick={() => inputRef.current?.click()}
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
