import { Skeleton } from '@/components/ui/skeleton';

export default function AdminOrdersLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
       <div className="rounded-lg border bg-card p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="space-y-2">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex w-full flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <Skeleton className="h-6 w-28" />
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-5 w-24 hidden sm:inline" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                        <Skeleton className="h-7 w-20" />
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
