import { Skeleton } from "@/components/ui/skeleton";

export default function NewAssetLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Back link skeleton */}
      <Skeleton className="h-4 w-32" />

      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-80" />
      </div>

      <div className="space-y-10">
        {/* Step 1: Category skeleton */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-6 w-52" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-start p-5 rounded-2xl border-2 border-border bg-card/40 backdrop-blur-sm"
              >
                <Skeleton className="size-12 rounded-xl mb-4" />
                <Skeleton className="h-5 w-28 mb-1" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4 mt-1" />
              </div>
            ))}
          </div>
        </section>

        {/* Placeholder hint skeleton */}
        <div className="p-8 rounded-2xl border-2 border-dashed border-border bg-muted/20 backdrop-blur-sm">
          <Skeleton className="h-4 w-72 mx-auto" />
        </div>
      </div>
    </div>
  );
}
