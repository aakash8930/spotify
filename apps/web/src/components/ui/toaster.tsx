'use client';

import { Toaster as Sonner } from 'sonner';

// Wrapped Sonner so the visual style matches the rest of the app — pill
// pattern, surface-2 bg, no jarring white toast on a dark UI.
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      richColors={false}
      closeButton={false}
      duration={3500}
      toastOptions={{
        classNames: {
          toast:
            'group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-[var(--shadow-elevated)]',
          title: 'text-sm font-medium',
          description: 'text-xs text-[var(--color-text-muted)]',
          actionButton: 'bg-[var(--color-accent)] text-[var(--color-accent-fg)]',
          cancelButton: 'bg-[var(--color-surface-3)] text-[var(--color-text-muted)]',
        },
      }}
    />
  );
}

export { toast } from 'sonner';
