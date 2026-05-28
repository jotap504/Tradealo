'use client';

import { useState, useRef, useEffect } from 'react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/store';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the Firebase ID token after successful verification */
  onVerified: (idToken: string) => Promise<void>;
  mode?: 'login' | 'link';
}

type Step = 'phone' | 'otp';

export function PhoneAuthModal({ open, onClose, onVerified, mode = 'login' }: Props) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setStep('phone');
      setPhone('');
      setOtp('');
      confirmationRef.current = null;
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
    }
  }, [open]);

  const setupRecaptcha = () => {
    if (recaptchaRef.current) return recaptchaRef.current;
    const verifier = new RecaptchaVerifier(
      firebaseAuth,
      'recaptcha-container',
      { size: 'invisible' },
    );
    recaptchaRef.current = verifier;
    return verifier;
  };

  const handleSendOtp = async () => {
    const normalized = phone.trim().startsWith('+') ? phone.trim() : `+54${phone.trim()}`;
    if (normalized.length < 10) {
      toast.error('Ingresá un número válido');
      return;
    }
    setLoading(true);
    try {
      const verifier = setupRecaptcha();
      const result = await signInWithPhoneNumber(firebaseAuth, normalized, verifier);
      confirmationRef.current = result;
      setStep('otp');
      toast.success('Código enviado por SMS');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Error al enviar SMS';
      toast.error(msg);
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!confirmationRef.current) return;
    if (otp.trim().length < 4) {
      toast.error('Ingresá el código recibido');
      return;
    }
    setLoading(true);
    try {
      const result = await confirmationRef.current.confirm(otp.trim());
      const idToken = await result.user.getIdToken();
      await onVerified(idToken);
      onClose();
    } catch {
      toast.error('Código incorrecto o expirado');
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === 'link' ? 'Vincular celular' : 'Iniciar sesión con celular';

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div ref={containerRef} className="space-y-4">
        <div id="recaptcha-container" />

        {step === 'phone' && (
          <>
            <p className="text-sm text-tradealo-text-muted">
              {mode === 'link'
                ? 'Ingresá tu número para vincularlo a tu cuenta.'
                : 'Te enviaremos un código por SMS para ingresar.'}
            </p>
            <Input
              label="Número de celular"
              type="tel"
              placeholder="+54 9 11 1234 5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
            />
            <Button fullWidth loading={loading} onClick={handleSendOtp}>
              Enviar código
            </Button>
          </>
        )}

        {step === 'otp' && (
          <>
            <p className="text-sm text-tradealo-text-muted">
              Ingresá el código de 6 dígitos que enviamos a <strong>{phone}</strong>.
            </p>
            <Input
              label="Código de verificación"
              type="text"
              inputMode="numeric"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
            />
            <Button fullWidth loading={loading} onClick={handleVerifyOtp}>
              Verificar
            </Button>
            <button
              onClick={() => setStep('phone')}
              className="w-full text-center text-sm text-tradealo-primary hover:underline"
            >
              Cambiar número
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}