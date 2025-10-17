
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

  const imageUrl = product.images?.[0]?.url;
  const imageHint = product.images?.[0]?.hint;

  return (
    <Card className="group w-full overflow-hidden border-2 border-transparent transition-all hover:border-primary">
      <CardContent className="p-0">
        <div className="relative overflow-hidden aspect-[4/5]">
          <Link href={`/products/${product.id}`}>
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                data-ai-hint={imageHint}
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground">No image</span>
              </div>
            )}
          </Link>
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
