import { Skeleton } from '@/components/ui/skeleton';

export default function ProductPageLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
      <div className="grid animate-pulse gap-8 md:grid-cols-2 md:gap-12">
        <div>
          <Skeleton className="aspect-[4/5] w-full max-w-md mx-auto rounded-lg" />
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-32" />
          
          <div className="space-y-4">
            <Skeleton className="h-5 w-16" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-10 w-16" />
            </div>
          </div>

          <div className="space-y-4">
            <Skeleton className="h-5 w-16" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>

          <div className="flex gap-4">
            <Skeleton className="h-12 flex-grow" />
            <Skeleton className="h-12 w-12" />
            <Skeleton className="h-12 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}
