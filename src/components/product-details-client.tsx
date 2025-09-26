
"use client";
import { useState } from "react";
import type { Product } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function ProductDetailsClient({ product }: { product: Product }) {
  const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const { dispatch: cartDispatch } = useCart();
  const { dispatch: wishlistDispatch, isInWishlist } = useWishlist();
  const { toast } = useToast();
  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = () => {
    cartDispatch({
      type: "ADD_ITEM",
      payload: {
        product,
        quantity: 1,
        size: selectedSize,
        color: selectedColor,
      },
    });
    toast({
      title: "Added to cart!",
      description: `${product.name} (${selectedSize}, ${selectedColor}) is now in your cart.`,
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
    <div className="flex flex-col gap-6">
      <div>
        <Label className="mb-2 block font-semibold">Size</Label>
        <RadioGroup
          defaultValue={selectedSize}
          onValueChange={setSelectedSize}
          className="flex flex-wrap gap-2"
        >
          {product.sizes.map((size) => (
            <Label
              key={size}
              htmlFor={`size-${size}`}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-md border-2 border-border p-2 px-4 transition-colors hover:bg-accent hover:text-accent-foreground",
                selectedSize === size && "border-primary bg-primary/10 text-primary"
              )}
            >
              <RadioGroupItem value={size} id={`size-${size}`} className="sr-only" />
              {size}
            </Label>
          ))}
        </RadioGroup>
      </div>
      <div>
        <Label className="mb-2 block font-semibold">Color</Label>
        <RadioGroup
          defaultValue={selectedColor}
          onValueChange={setSelectedColor}
          className="flex flex-wrap gap-2"
        >
          {product.colors.map((color) => (
            <Label
              key={color}
              htmlFor={`color-${color}`}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-md border-2 border-border p-2 px-4 transition-colors hover:bg-accent hover:text-accent-foreground",
                selectedColor === color && "border-primary bg-primary/10 text-primary"
              )}
            >
              <RadioGroupItem value={color} id={`color-${color}`} className="sr-only" />
              {color}
            </Label>
          ))}
        </RadioGroup>
      </div>

      <div className="flex gap-4">
        <Button size="lg" className="flex-grow bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleAddToCart}>
          <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
        </Button>
        <Button size="icon" variant="outline" className="h-12 w-12" onClick={handleWishlistToggle}>
          <Heart className={cn("h-5 w-5", inWishlist && "fill-red-500 text-red-500")} />
        </Button>
      </div>
    </div>
  );
}
