'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const links = [
  { href: '/account', label: 'Profile' },
  { href: '/account/security', label: 'Security' },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account sections" className="flex gap-2 md:flex-col">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? 'page' : undefined}
          className={cn(
            'hover:bg-accent rounded-md px-3 py-2 text-sm',
            pathname === link.href && 'bg-accent font-medium',
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
