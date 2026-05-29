'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Compass, Heart, Library, ListMusic, LogOut, Radio, Upload } from 'lucide-react';
import { useAuth } from './auth-provider';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/rooms', label: 'Rooms', icon: Radio },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/likes', label: 'Liked', icon: Heart },
  { href: '/playlists', label: 'Playlists', icon: ListMusic },
  { href: '/upload', label: 'Upload', icon: Upload },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  // Marketing pages get no sidebar.
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') return null;
  if (loading) return <aside className="hidden w-64 shrink-0 md:block" />;

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 md:flex">
      <Link href={user ? '/discover' : '/'} className="flex items-center gap-2 px-3">
        <div className="size-8 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)]" />
        <span className="text-lg font-semibold tracking-tight">Resonate</span>
      </Link>

      {user ? (
        <>
          <nav className="mt-8 flex flex-col gap-0.5">
            {NAV.map((n) => {
              const active = pathname === n.href || pathname.startsWith(n.href + '/');
              const Icon = n.icon;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-[var(--color-surface-2)] text-[var(--color-text)]'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]',
                  )}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.25 : 2}
                    className={active ? 'text-[var(--color-accent)]' : ''}
                  />
                  <span className={active ? 'font-medium' : ''}>{n.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] text-sm font-semibold text-[var(--color-accent-fg)]">
              {(user.displayName ?? user.username).slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user.displayName ?? user.username}</div>
              <div className="truncate text-xs text-[var(--color-text-muted)]">@{user.username}</div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push('/');
              }}
              aria-label="Log out"
              className="rounded-md p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]"
            >
              <LogOut size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="mt-8 flex flex-col gap-2">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-[var(--color-accent)] px-3 py-2 text-center text-sm font-medium text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)]"
          >
            Sign up
          </Link>
        </div>
      )}
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading || !user) return null;
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') return null;
  // Hide while a /rooms/[code] page is open — there's already a top header
  // and the room view has its own dense controls; another nav crowds it.
  if (pathname.startsWith('/rooms/') && pathname !== '/rooms') return null;

  // Limit to 5 most-used items so the bar doesn't get cramped on narrow screens.
  const items = NAV.filter((n) => n.label !== 'Upload');

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-20 z-30 grid grid-cols-5 border-t border-[var(--color-border)] bg-[var(--color-bg)]/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl md:hidden"
    >
      {items.map((n) => {
        const active = pathname === n.href || pathname.startsWith(n.href + '/');
        const Icon = n.icon;
        return (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium',
              active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]',
            )}
          >
            <Icon size={20} strokeWidth={active ? 2.25 : 2} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
