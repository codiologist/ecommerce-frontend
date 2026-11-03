import { ProfileSection } from './profile-section';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My account' };

export default function AccountPage() {
  return <ProfileSection />;
}
