import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 max-w-5xl animate-in fade-in duration-300">
      {/* Welcome Header skeleton */}
      <div className="flex items-start gap-4">
        <Skeleton className="size-12 rounded-2xl shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      {/* Stats Grid skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card/40 p-5 space-y-3 backdrop-blur-sm shadow-sm"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="size-4 rounded" />
            </div>
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Quick Actions skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-start gap-4 rounded-3xl border border-border bg-card/40 p-6 backdrop-blur-sm shadow-sm"
            >
              <Skeleton className="size-12 rounded-2xl" />
              <div className="flex-1 w-full flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="size-5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm divide-y divide-border/30 overflow-hidden shadow-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="size-12 rounded-xl shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
