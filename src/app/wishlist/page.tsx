
"use client";

import { useWishlist } from "@/contexts/wishlist-context";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function WishlistPage() {
  const { state } = useWishlist();

  if (state.loading) {
      return (
        <div className="container mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 py-8 text-center md:py-12">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
      )
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
      <h1 className="mb-8 font-headline text-3xl font-bold tracking-tighter md:text-4xl">
        Your Wishlist
      </h1>
      {state.items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
          {state.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
         <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-card p-8 text-center">
          <h2 className="text-xl font-semibold">Your wishlist is empty.</h2>
          <p className="text-muted-foreground">Browse our collection and save your favorite tees for later.</p>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/products">Discover Products</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
