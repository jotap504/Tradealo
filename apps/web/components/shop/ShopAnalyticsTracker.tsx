'use client';
import { useEffect } from 'react';
import { shop as shopApi } from '@/lib/api';

export default function ShopAnalyticsTracker({ shopId }: { shopId: string }) {
  useEffect(() => {
    shopApi
      .trackEvent(shopId, {
        eventType: 'page_view',
        referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
      })
      .catch(() => null);
  }, [shopId]);

  return null;
}
