'use client';

import { CircleUser } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useLogout } from '../mutations';
import { useMe } from '../queries';
import { STAFF_ROLES } from '../types';

export function AccountMenu() {
  const me = useMe();
  const logout = useLogout();
  const router = useRouter();

  if (me.isPending) return <span className="h-8 w-20" aria-hidden="true" />;

  if (!me.data) {
    return (
      <nav className="flex items-center gap-2" aria-label="Account">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/register">Create account</Link>
        </Button>
      </nav>
    );
  }

  const user = me.data;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Account menu">
          <CircleUser aria-hidden="true" />
          <span className="max-w-32 truncate">{user.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="grid">
          <span className="truncate">{user.name}</span>
          <span className="text-muted-foreground truncate text-xs font-normal">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">My account</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/security">Security</Link>
        </DropdownMenuItem>
        {STAFF_ROLES.includes(user.role) ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">Admin panel</Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={logout.isPending}
          onSelect={() => {
            logout.mutate(undefined, {
              onSettled: () => {
                router.replace('/');
              },
            });
          }}
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
