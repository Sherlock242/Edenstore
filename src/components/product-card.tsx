
"use client";

import type { Product } from "@/app/actions";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
import { Heart, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { useToast } from "@/hooks/use-toast";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { dispatch: wishlistDispatch, isInWishlist } = useWishlist();
  const { toast } = useToast();
  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = () => {
    addToCart({
      product,
      size: product.sizes[0],
      color: product.colors[0],
    });
  };

  const handleWishlistToggle = () => {
    if (inWishlist) {
      wishlistDispatch({ type: 'REMOVE_ITEM', payload: { productId: product.id } });
       toast({
        title: "Removed from Wishlist",
        description: `${product.name} has been removed from your wishlist.`,
      });
    } else {
      wishlistDispatch({ type: 'ADD_ITEM', payload: product });
       toast({
        title: "Added to Wishlist!",
        description: `${product.name} has been added to your wishlist.`,
      });
    }
  };


  return (
    <Card className="group w-full overflow-hidden border-2 border-transparent transition-all hover:border-primary">
      <CardContent className="p-0">
        <div className="relative overflow-hidden">
          <Link href={`/products/${product.id}`}>
            <Image
              src={product.images[0].url}
              alt={product.name}
              width={400}
              height={500}
              className="h-auto w-full object-cover transition-transform duration-300 group-hover:scale-105"
              data-ai-hint={product.images[0].hint}
            />
          </Link>
          <div className="absolute bottom-2 left-2 right-2 flex translate-y-16 items-center justify-center gap-2 transition-transform duration-300 group-hover:translate-y-0">
            <Button size="sm" className="flex-grow bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleAddToCart}>
              <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
            </Button>
            <Button size="icon" variant="secondary" onClick={handleWishlistToggle}>
              <Heart className={`h-4 w-4 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="p-4">
          <Link href={`/products/${product.id}`}>
            <h3 className="font-semibold truncate">{product.name}</h3>
          </Link>
          <p className="text-sm text-muted-foreground">{product.category}</p>
          <p className="mt-2 font-bold">${product.price.toFixed(2)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
