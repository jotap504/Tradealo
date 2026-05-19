import { Check, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KycStatus } from '@/types';

interface Props {
  status: KycStatus;
  className?: string;
}

const STEPS = [
  { key: 'phoneCamera', label: 'Foto del DNI' },
  { key: 'selfie', label: 'Selfie con DNI' },
] as const;

export function KycProgress({ status, className }: Props) {
  const completed = STEPS.filter(
    (s) => (status as unknown as Record<string, boolean>)[s.key]
  ).length;
  const total = STEPS.length;
  const percent = Math.round((completed / total) * 100);

  return (
    <div className={cn('bg-white rounded-2xl border border-tradealo-border p-6', className)}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-tradealo-primary-light flex items-center justify-center text-tradealo-primary">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-base">
            Verificación de identidad
          </h3>
          <p className="text-sm text-tradealo-text-muted">
            Nivel actual:{' '}
            <span className="font-semibold text-tradealo-text">
              {status.level}
            </span>{' '}
            de 2
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-heading font-bold text-tradealo-primary">
            {percent}%
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full bg-tradealo-primary rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="mt-5 space-y-2">
        {STEPS.map((s) => {
          const ok = !!(status as unknown as Record<string, boolean>)[s.key];
          return (
            <li key={s.key} className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center',
                  ok
                    ? 'bg-tradealo-success text-white'
                    : 'bg-gray-200 text-gray-400'
                )}
              >
                {ok ? <Check size={12} strokeWidth={3} /> : '·'}
              </span>
              <span
                className={cn(
                  ok ? 'text-tradealo-text' : 'text-tradealo-text-muted'
                )}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
