import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function TrackRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-2">
      <Skeleton className="size-10 shrink-0 rounded" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-3 w-10" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
