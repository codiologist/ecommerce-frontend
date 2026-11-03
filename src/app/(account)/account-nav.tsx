'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';

const links = [
  { href: '/account', label: 'Profile' },
  { href: '/account/security', label: 'Security' },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account sections" className="flex gap-1 md:flex-col">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Button
            key={link.href}
            asChild
            variant={active ? 'secondary' : 'ghost'}
            className="justify-start"
          >
            <Link href={link.href} aria-current={active ? 'page' : undefined}>
              {link.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
