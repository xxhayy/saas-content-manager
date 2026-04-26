import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectEditorLoading() {
  return (
    <div className="h-[calc(100vh-3.5rem)] -mx-4 -mb-4 md:-m-6 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-40 rounded-lg" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 bg-muted/20 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="space-y-3 text-center">
            <Skeleton className="h-5 w-32 rounded mx-auto" />
            <Skeleton className="h-4 w-48 rounded mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
