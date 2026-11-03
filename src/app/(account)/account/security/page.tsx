import { SecuritySections } from './security-sections';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Security' };

export default function SecurityPage() {
  return <SecuritySections />;
}
