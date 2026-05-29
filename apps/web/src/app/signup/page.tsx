'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { AuthLayout, Field } from '@/components/auth-layout';

export default function SignupPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, username, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: unknown } | null;
      setErr(typeof data?.error === 'string' ? data.error : 'Sign up failed');
      return;
    }
    await refresh();
    router.push('/discover');
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free, takes ten seconds."
      footer={
        <>
          Already have one?{' '}
          <Link href="/login" className="text-[var(--color-accent)] hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoFocus
          autoComplete="email"
          required
        />
        <Field
          label="Username"
          value={username}
          onChange={setUsername}
          autoComplete="username"
          required
          placeholder="3–24 letters, numbers, underscores"
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
          placeholder="At least 8 characters"
        />
        {err && (
          <p
            role="alert"
            className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]"
          >
            {err}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-lg bg-[var(--color-accent)] py-2.5 text-sm font-medium text-[var(--color-accent-fg)] transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <p className="text-center text-xs text-[var(--color-text-subtle)]">
          By signing up you agree this is a personal portfolio project, not a paid service.
        </p>
      </form>
    </AuthLayout>
  );
}