'use client';

import { useEffect, useState } from 'react';
import { formatDate, formatRelative } from '@/lib/utils';

interface Props {
  iso: string | null | undefined;
  className?: string;
}

export function RelativeTime({ iso, className }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!iso) return null;
  const text = mounted ? formatRelative(iso) : formatDate(iso);
  return <span className={className}>{text}</span>;
}
