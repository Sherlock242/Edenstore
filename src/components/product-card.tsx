
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
    // Default to the first available variant when adding from a product card
    const firstAvailableSize = product.sizes.find(s => s.variants.some(v => v.quantity > 0));
    if (firstAvailableSize) {
      const firstAvailableColor = firstAvailableSize.variants.find(v => v.quantity > 0);
      if (firstAvailableColor) {
        addToCart({
          product,
          size: firstAvailableSize.size,
          color: firstAvailableColor.color,
        });
      }
    }
  };

  const imageUrl = product.images?.[0]?.url;
  const imageHint = product.images?.[0]?.hint;
  const compareAtPrice = product.price * 1.4;
  const discountAmount = compareAtPrice - product.price;

  return (
    <Card className="group w-full overflow-hidden rounded-lg bg-card border border-border/20 shadow-none">
      <CardContent className="p-0">
        <div className="relative overflow-hidden aspect-[4/5] bg-white">
          <Link href={`/products/${product.id}`}>
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                className="object-contain transition-transform duration-300 group-hover:scale-105"
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
        <div className="p-4 bg-card text-card-foreground">
          <Link href={`/products/${product.id}`}>
            <h3 className="font-semibold truncate text-lg">{product.name}</h3>
          </Link>
          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
            <p className="font-bold text-xl">₹{product.price.toFixed(0)}</p>
            <p className="text-md text-muted-foreground line-through">
              ₹{compareAtPrice.toFixed(0)}
            </p>
          </div>
            <p className="text-md font-bold text-green-500 mt-1">
                ₹{discountAmount.toFixed(0)} OFF
            </p>
          <p className="text-xs text-purple-400 mt-2 whitespace-nowrap">lowest in last 30 days</p>
        </div>
      </CardContent>
    </Card>
  );
}
