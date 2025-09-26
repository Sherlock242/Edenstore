
import { getProducts } from '@/app/actions';
import { ProductCard } from '@/components/product-card';

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
      <div className="mb-8 text-center">
        <h1 className="font-headline text-3xl font-bold tracking-tighter md:text-4xl">
          All T-Shirts
        </h1>
        <p className="mt-2 text-muted-foreground">
          Browse our full collection of exclusive anime-inspired apparel.
        </p>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-card p-8 text-center">
          <h2 className="text-xl font-semibold">No products found.</h2>
          <p className="text-muted-foreground">
            Looks like there are no products available right now. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}
