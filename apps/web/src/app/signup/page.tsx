'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';

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
    <main className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">Free, takes ten seconds.</p>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
        <input
          autoFocus
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
        />
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
        />
        <input
          type="password"
          placeholder="Password (8+ chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
        />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button
          disabled={busy}
          className="mt-2 rounded-lg bg-[var(--color-accent)] py-3 font-medium text-black disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-sm text-[var(--color-muted)]">
        Already have one?{' '}
        <Link href="/login" className="text-[var(--color-accent)] hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
