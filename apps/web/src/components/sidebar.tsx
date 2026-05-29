'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';

const NAV = [
  { href: '/discover', label: 'Discover', icon: '✦' },
  { href: '/rooms', label: 'Rooms', icon: '◉' },
  { href: '/library', label: 'Library', icon: '◫' },
  { href: '/likes', label: 'Liked', icon: '♥' },
  { href: '/playlists', label: 'Playlists', icon: '☰' },
  { href: '/upload', label: 'Upload', icon: '↑' },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  // Marketing pages get no sidebar.
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') return null;
  if (loading) return <aside className="hidden w-60 shrink-0 md:block" />;

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 md:flex">
      <Link href={user ? '/discover' : '/'} className="flex items-center gap-2 px-2">
        <div className="size-7 rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)]" />
        <span className="text-lg font-semibold tracking-tight">Resonate</span>
      </Link>

      {user ? (
        <>
          <nav className="mt-8 flex flex-col gap-1">
            {NAV.map((n) => {
              const active = pathname === n.href || pathname.startsWith(n.href + '/');
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    active
                      ? 'bg-[var(--color-surface-2)] text-[var(--color-text)]'
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <span className="w-4 text-center">{n.icon}</span>
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex items-center justify-between border-t border-[var(--color-border)] pt-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {user.displayName ?? user.username}
              </div>
              <div className="truncate text-xs text-[var(--color-muted)]">@{user.username}</div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push('/');
              }}
              className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
            >
              Log out
            </button>
          </div>
        </>
      ) : (
        <div className="mt-8 flex flex-col gap-2">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-center text-sm font-medium text-black"
          >
            Sign up
          </Link>
        </div>
      )}
    </aside>
  );
}
