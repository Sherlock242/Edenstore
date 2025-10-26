import { Skeleton } from '@/components/ui/skeleton';

export default function MyOrdersLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      <div className="mb-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="space-y-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-8 w-28" />
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-16 rounded-md" />
                <div className="flex-grow space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
