import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)]" />
          <span className="text-xl font-semibold tracking-tight">Resonate</span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-[var(--color-muted)]">
          <Link href="/login" className="hover:text-[var(--color-text)]">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-[var(--color-accent)] px-4 py-2 font-medium text-black hover:opacity-90"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <section className="mt-28">
        <h1 className="bg-gradient-to-br from-white to-white/60 bg-clip-text text-5xl font-bold leading-[1.05] tracking-tight text-transparent md:text-7xl">
          Music that
          <br />
          <span className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] bg-clip-text text-transparent">
            plays in sync.
          </span>
        </h1>
        <p className="mt-8 max-w-xl text-lg text-[var(--color-muted)]">
          Build playlists, search a catalog of free music, upload your own, and start a listening
          room where everyone hears the same beat at the same instant.
        </p>
        <div className="mt-10 flex gap-3">
          <Link
            href="/signup"
            className="rounded-full bg-[var(--color-accent)] px-6 py-3 font-medium text-black hover:opacity-90"
          >
            Start listening
          </Link>
          <Link
            href="/discover"
            className="rounded-full border border-[var(--color-border)] px-6 py-3 font-medium hover:bg-[var(--color-surface)]"
          >
            Browse without account
          </Link>
        </div>
      </section>

      <section className="mt-28 grid gap-4 md:grid-cols-3">
        {[
          {
            title: 'Listening rooms',
            body: 'Create a room, share the code. Everyone hears the same song, at the same instant. Live chat included.',
          },
          {
            title: 'Bring your own music',
            body: 'Drag-drop MP3 or FLAC. We extract artwork and tags, store it safely, and stream it back instantly.',
          },
          {
            title: 'Real catalog',
            body: 'Search Jamendo for full-length, legally streamable tracks — no 30-second previews.',
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
          >
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
