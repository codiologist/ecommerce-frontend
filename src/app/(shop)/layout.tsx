import { SiteHeader } from '@/components/shared/site-header';

import type { ReactNode } from 'react';

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
