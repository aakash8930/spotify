'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { AuthLayout, Field } from '@/components/auth-layout';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [emailOrUsername, setId] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ emailOrUsername, password }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr('Invalid email/username or password');
      return;
    }
    await refresh();
    router.push('/discover');
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to your library and rooms."
      footer={
        <>
          New here?{' '}
          <Link href="/signup" className="text-[var(--color-accent)] hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        <Field
          label="Email or username"
          value={emailOrUsername}
          onChange={setId}
          autoFocus
          autoComplete="username"
          required
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
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
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  );
}