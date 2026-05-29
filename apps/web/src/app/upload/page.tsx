'use client';

import { useCallback, useRef, useState } from 'react';
import type { Track } from '@resonate/shared/tracks';
import { invalidate } from '@/lib/api';

type Item = {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  track?: Track;
};

const ACCEPT = '.mp3,.flac,.wav,.m4a,.ogg,.webm,audio/*';

export default function UploadPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const next: Item[] = Array.from(files).map((f) => ({
      id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      status: 'pending',
      progress: 0,
    }));
    setItems((prev) => [...prev, ...next]);
    next.forEach((item) => uploadOne(item));
  }, []);

  const uploadOne = (item: Item) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading' } : i)));
    const fd = new FormData();
    fd.append('file', item.file, item.file.name);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/tracks/upload');
    xhr.withCredentials = true;
    xhr.upload.addEventListener('progress', (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, progress: pct } : i)));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const { track } = JSON.parse(xhr.responseText) as { track: Track };
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: 'done', progress: 100, track } : i)),
        );
        invalidate('/api/library/uploads');
      } else {
        const msg = readError(xhr.responseText);
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: 'error', error: msg } : i)),
        );
      }
    });
    xhr.addEventListener('error', () => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: 'error', error: 'network error' } : i,
        ),
      );
    });
    xhr.send(fd);
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Upload</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        MP3, FLAC, WAV, M4A, OGG. Up to 50 MB per file. We extract artwork and tags automatically.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`mt-8 flex h-48 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed transition ${
          drag
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)]'
        }`}
      >
        <div className="text-center">
          <div className="text-2xl">↑</div>
          <div className="mt-2 text-sm font-medium">Drop tracks here, or click to choose</div>
          <div className="mt-1 text-xs text-[var(--color-muted)]">
            Multiple files OK. We upload them in parallel.
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <ul className="mt-8 space-y-2">
        {items.map((i) => (
          <li
            key={i.id}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
          >
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {i.track?.title ?? i.file.name}
                </div>
                <div className="truncate text-xs text-[var(--color-muted)]">
                  {i.track ? `${i.track.artist}${i.track.album ? ` — ${i.track.album}` : ''}` : i.file.type || 'audio'}
                </div>
              </div>
              <span className="text-xs text-[var(--color-muted)]">
                {(i.file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <span className="w-20 text-right text-xs">
                {i.status === 'uploading' && `${i.progress}%`}
                {i.status === 'done' && <span className="text-[var(--color-accent)]">done</span>}
                {i.status === 'error' && <span className="text-red-400">failed</span>}
                {i.status === 'pending' && '…'}
              </span>
            </div>
            {(i.status === 'uploading' || i.status === 'pending') && (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                <div
                  className="h-full bg-[var(--color-accent)] transition-all"
                  style={{ width: `${i.progress}%` }}
                />
              </div>
            )}
            {i.status === 'error' && i.error && (
              <p className="mt-2 text-xs text-red-400">{i.error}</p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

const readError = (body: string): string => {
  try {
    const json = JSON.parse(body) as { error?: unknown };
    if (typeof json.error === 'string') return json.error;
    return JSON.stringify(json.error);
  } catch {
    return body || 'upload failed';
  }
};
