import { AdminTwoFactorSetup } from './admin-two-factor-setup';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Set up two-factor authentication' };

export default function AdminSetupTwoFactorPage() {
  return <AdminTwoFactorSetup />;
}
