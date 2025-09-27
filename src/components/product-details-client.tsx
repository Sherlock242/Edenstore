
"use client";
import { useState, useEffect } from "react";
import type { Product } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function ProductDetailsClient({ product }: { product: Product }) {
  const [selectedSize, setSelectedSize] = useState(product.sizes[0]?.size);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [isOutOfStock, setIsOutOfStock] = useState(false);

  const { addToCart } = useCart();
  const { dispatch: wishlistDispatch, isInWishlist } = useWishlist();
  const { toast } = useToast();
  const inWishlist = isInWishlist(product.id);

  useEffect(() => {
    const sizeInfo = product.sizes.find(s => s.size === selectedSize);
    if (sizeInfo && sizeInfo.quantity <= 0) {
        setIsOutOfStock(true);
    } else {
        setIsOutOfStock(false);
    }
  }, [selectedSize, product.sizes]);

  const handleAddToCart = () => {
    if (isOutOfStock) {
        toast({
            variant: "destructive",
            title: "Out of Stock",
            description: "This size is currently unavailable.",
        });
        return;
    }
    addToCart({
      product,
      size: selectedSize,
      color: selectedColor,
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
          {product.sizes.map((sizeInfo) => (
            <Label
              key={sizeInfo.size}
              htmlFor={`size-${sizeInfo.size}`}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-md border-2 border-border p-2 px-4 transition-colors hover:bg-accent hover:text-accent-foreground",
                selectedSize === sizeInfo.size && "border-primary bg-primary/10 text-primary",
                sizeInfo.quantity <= 0 && "cursor-not-allowed bg-muted/50 text-muted-foreground line-through hover:bg-muted/50"
              )}
            >
              <RadioGroupItem value={sizeInfo.size} id={`size-${sizeInfo.size}`} className="sr-only" disabled={sizeInfo.quantity <= 0} />
              {sizeInfo.size}
            </Label>
          ))}
        </RadioGroup>
         {isOutOfStock && <p className="mt-2 text-sm text-destructive">This size is out of stock.</p>}
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
        <Button size="lg" className="flex-grow bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleAddToCart} disabled={isOutOfStock}>
          {isOutOfStock ? "Out of Stock" : <><ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart</>}
        </Button>
        <Button size="icon" variant="outline" className="h-12 w-12" onClick={handleWishlistToggle}>
          <Heart className={cn("h-5 w-5", inWishlist && "fill-red-500 text-red-500")} />
        </Button>
      </div>
    </div>
  );
}
