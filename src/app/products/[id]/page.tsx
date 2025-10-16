

import { getProducts, type Product } from "@/app/actions";
import { notFound } from "next/navigation";
import { ProductDetailsClient } from "@/components/product-details-client";
import { ProductCard } from "@/components/product-card";
import { ProductImageCarousel } from "@/components/product-image-carousel";
import { cookies } from "next/headers";
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from "@supabase/supabase-js";
import { getReviewsForProduct } from "@/app/reviews/actions";
import { ProductReviews } from "@/components/product-reviews";
import { Suspense } from "react";
import { Loader2 }m "lucide-react";
import { AverageRating } from "@/components/average-rating";

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  // Fetch product and reviews in parallel
  const [products, reviewsResult] = await Promise.all([
    getProducts(cookieStore),
    getReviewsForProduct(params.id)
  ]);
  
  const product = products.find((p) => p.id === params.id);

  if (!product) {
    notFound();
  }

  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const { reviews = [], averageRating = 0, totalReviews = 0 } = reviewsResult.success ? reviewsResult : {};

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="flex items-start justify-center">
            <ProductImageCarousel images={product.images} productName={product.name} />
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="font-headline text-3xl font-bold tracking-tighter md:text-4xl">
            {product.name}
          </h1>
          
          <AverageRating averageRating={averageRating} totalReviews={totalReviews} />

          <p className="text-3xl font-bold">₹{product.price.toFixed(2)}</p>

          <ProductDetailsClient product={product} />
        </div>
      </div>

       <div className="mt-16 md:mt-24">
         <ProductReviews 
            productId={product.id}
            initialReviews={reviews}
            initialAverageRating={averageRating}
            initialTotalReviews={totalReviews}
          />
      </div>

      <div className="mt-16 md:mt-24">
        <h2 className="font-headline text-2xl font-bold tracking-tighter md:text-3xl mb-8">
            You Might Also Like
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map(p => (
                <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </div>
    </div>
  );
}

export async function generateStaticParams() {
    // This function runs at build time, so we need a client that doesn't depend on user cookies.
    // We create a generic client here to fetch public data.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: products } = await supabase.from('products').select('id');
    
    if (!products) {
        return [];
    }

    return products.map((product) => ({
      id: product.id.toString(),
    }));
}
