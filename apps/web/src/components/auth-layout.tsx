import Link from 'next/link';
import type { ReactNode } from 'react';

// Shared shell for /login and /signup. Splits the screen into a brand panel
// and a form panel so the auth flow feels deliberate rather than a generic
// boxed form floating on a dark page.
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Brand panel — hidden on mobile to keep the form first. */}
      <aside className="relative hidden flex-1 overflow-hidden bg-[var(--color-surface)] md:block">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent)]/15 via-transparent to-[var(--color-accent-2)]/15" />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-32 size-[28rem] rounded-full bg-[var(--color-accent)]/15 blur-[100px]"
        />
        <div className="relative flex h-full flex-col p-12">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] shadow-[var(--shadow-card)]" />
            <span className="text-xl font-semibold tracking-tight">Resonate</span>
          </Link>
          <div className="mt-auto max-w-sm">
            <p className="text-3xl font-semibold leading-tight tracking-tight">
              Listen with <em className="not-italic text-[var(--color-accent)]">friends</em>,{' '}
              not just <em className="not-italic">to</em> them.
            </p>
            <p className="mt-4 text-sm text-[var(--color-text-muted)]">
              Synced rooms, real-time chat, and a real catalog. Free.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 md:hidden"
          >
            <div className="size-8 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)]" />
            <span className="font-semibold tracking-tight">Resonate</span>
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{subtitle}</p>
          {children}
          <div className="mt-8 text-sm text-[var(--color-text-muted)]">{footer}</div>
        </div>
      </main>
    </div>
  );
}

// Reusable form input — proper focus ring, label, optional error.
export function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoFocus,
  autoComplete,
  required,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
      />
    </label>
  );
}
