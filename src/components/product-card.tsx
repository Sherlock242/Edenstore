
"use client";

import type { Product } from "@/app/actions";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/cart-context";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart({
      product,
      size: product.sizes[0]?.size || 'M',
      color: product.colors[0] || 'Black',
    });
  };

  return (
    <Card className="group w-full overflow-hidden border-2 border-transparent transition-all hover:border-primary">
      <CardContent className="p-0">
        <div className="relative overflow-hidden aspect-[4/5]">
          <Link href={`/products/${product.id}`}>
            <Image
              src={product.images[0].url}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              data-ai-hint={product.images[0].hint}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          </Link>
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 p-2 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:bottom-2">
            <Button size="sm" className="flex-grow bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleAddToCart}>
              <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
            </Button>
          </div>
        </div>
        <div className="p-4">
          <Link href={`/products/${product.id}`}>
            <h3 className="font-semibold truncate">{product.name}</h3>
          </Link>
          <p className="text-sm text-muted-foreground">{product.category}</p>
          <p className="mt-2 font-bold">₹{product.price.toFixed(2)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
