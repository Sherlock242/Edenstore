import { Skeleton } from '@/components/ui/skeleton';

export default function ProductsLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
      <div className="mb-8 text-center">
        <Skeleton className="h-10 w-64 mx-auto" />
        <Skeleton className="mt-2 h-4 w-96 mx-auto" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="w-full">
            <Skeleton className="aspect-[4/5] w-full" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-6 w-1/4 mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
