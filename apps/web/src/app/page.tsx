import Link from 'next/link';
import { ArrowRight, Headphones, Mic2, Radio, Sparkles, Upload } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Subtle ambient glows for depth without a stock-image vibe */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-[var(--color-accent)]/15 blur-[120px]" />
        <div className="absolute right-[-10rem] top-[20rem] size-[32rem] rounded-full bg-[var(--color-accent-2)]/10 blur-[120px]" />
      </div>

      <main className="mx-auto max-w-6xl px-6 pb-32 pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] shadow-[var(--shadow-card)]" />
            <span className="text-xl font-semibold tracking-tight">Resonate</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[var(--color-accent)] px-4 py-2 font-medium text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)]"
            >
              Sign up
            </Link>
          </nav>
        </header>

        <section className="mt-24 grid gap-8 md:mt-32 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)]">
              <Sparkles size={12} className="text-[var(--color-accent)]" />
              Listening rooms in beta
            </span>
            <h1 className="mt-6 bg-gradient-to-br from-white to-white/55 bg-clip-text text-5xl font-bold leading-[1.04] tracking-tight text-transparent md:text-7xl">
              Music that
              <br />
              <span className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] bg-clip-text text-transparent">
                plays in sync.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--color-text-muted)]">
              Build playlists, search a real catalog, upload your own tracks, and start a
              listening room where everyone hears the same beat at the same instant.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 font-medium text-[var(--color-accent-fg)] shadow-[var(--shadow-card)] transition hover:bg-[var(--color-accent-hover)]"
              >
                Start listening
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/discover"
                className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3 font-medium hover:bg-[var(--color-surface-2)]"
              >
                Browse without account
              </Link>
            </div>
            <p className="mt-6 text-xs text-[var(--color-text-subtle)]">
              Free for personal use. No credit card.
            </p>
          </div>

          <ProductPreview />
        </section>

        <section className="mt-32 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Radio,
              title: 'Listening rooms',
              body: 'Create a room, share the code. Everyone hears the same song, at the same instant. Live chat included.',
            },
            {
              icon: Upload,
              title: 'Bring your own music',
              body: 'Drag-drop MP3 or FLAC. We extract artwork and tags, store it safely, and stream it back instantly.',
            },
            {
              icon: Headphones,
              title: 'Real catalog',
              body: 'Search across English, Hindi, Bollywood, regional — full-length tracks, not 30-second previews.',
            },
            {
              icon: Mic2,
              title: 'Crystal-clear streams',
              body: 'Up to 320 kbps audio with smart fallback when the network gets choppy. Just plays.',
            },
            {
              icon: Sparkles,
              title: 'Drag-to-reorder playlists',
              body: 'Build the perfect set. Reorder by dragging. Public or private — your call.',
            },
            {
              icon: ArrowRight,
              title: 'Keyboard-first',
              body: 'Space to play, shift-arrow to skip, M to mute. Hands stay where you want them.',
            },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-border-strong)]"
              >
                <div className="grid size-10 place-items-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                  <Icon size={18} />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                  {f.body}
                </p>
              </div>
            );
          })}
        </section>

        <footer className="mt-24 flex flex-col items-center justify-between gap-3 border-t border-[var(--color-border)] pt-8 text-xs text-[var(--color-text-subtle)] sm:flex-row">
          <span>© Resonate. Built for listeners.</span>
          <span>Made with care, not stock UI kits.</span>
        </footer>
      </main>
    </div>
  );
}

// Static product preview — a stylized version of the player. Avoids
// stock illustrations and shows people what they're signing up for.
function ProductPreview() {
  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-[var(--color-accent)]/20 to-[var(--color-accent-2)]/15 blur-2xl" />
      <div className="overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-elevated)]">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/60 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-[var(--color-danger)]/80" />
          <span className="size-2.5 rounded-full bg-[var(--color-warn)]/80" />
          <span className="size-2.5 rounded-full bg-[var(--color-success)]/80" />
          <span className="ml-3 text-xs text-[var(--color-text-subtle)]">resonate.app/rooms/QRNC6J</span>
        </div>
        <div className="flex items-center gap-4 p-6">
          <div className="size-24 shrink-0 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] shadow-[var(--shadow-card)]" />
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wider text-[var(--color-accent)]">Playing now</div>
            <div className="mt-1 truncate text-lg font-semibold">Tum Hi Ho</div>
            <div className="truncate text-sm text-[var(--color-text-muted)]">Arijit Singh</div>
            <div className="mt-4 h-1 rounded-full bg-[var(--color-surface-3)]">
              <div className="h-full w-2/5 rounded-full bg-[var(--color-text)]" />
            </div>
            <div className="mt-1 flex justify-between text-[10px] tabular-nums text-[var(--color-text-subtle)]">
              <span>1:42</span>
              <span>4:14</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border)] px-6 py-4">
          <div className="flex -space-x-1.5">
            {['A', 'M', 'S', 'K'].map((c, i) => (
              <div
                key={c}
                className="grid size-6 place-items-center rounded-full border-2 border-[var(--color-surface)] bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] text-[10px] font-semibold text-[var(--color-accent-fg)]"
                style={{ zIndex: 4 - i }}
              >
                {c}
              </div>
            ))}
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">4 listening · in sync</span>
        </div>
      </div>
    </div>
  );
}