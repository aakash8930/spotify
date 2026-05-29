'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';

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
      setErr('Invalid credentials');
      return;
    }
    await refresh();
    router.push('/discover');
  };

  return (
    <main className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">Log in to your library and rooms.</p>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
        <input
          autoFocus
          placeholder="Email or username"
          value={emailOrUsername}
          onChange={(e) => setId(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
        />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button
          disabled={busy}
          className="mt-2 rounded-lg bg-[var(--color-accent)] py-3 font-medium text-black disabled:opacity-60"
        >
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-6 text-sm text-[var(--color-muted)]">
        New here?{' '}
        <Link href="/signup" className="text-[var(--color-accent)] hover:underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
