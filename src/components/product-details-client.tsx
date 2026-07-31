"use client";
import { useState, useEffect, useMemo } from "react";
import type { Product } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Share2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function ProductDetailsClient({ product }: { product: Product }) {
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);

  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { toast } = useToast();
  const inWishlist = isInWishlist(product.id);

  // Memoize available colors for the selected size
  const availableColors = useMemo(() => {
    if (!selectedSize) return [];
    const sizeData = product.sizes.find(s => s.size === selectedSize);
    return sizeData ? sizeData.variants : [];
  }, [selectedSize, product.sizes]);

  // Effect to set default size and color on mount
  useEffect(() => {
    const firstAvailableSize = product.sizes.find(s => s.variants.some(v => v.quantity > 0));
    if (firstAvailableSize) {
      setSelectedSize(firstAvailableSize.size);
      const firstAvailableColor = firstAvailableSize.variants.find(v => v.quantity > 0);
      if (firstAvailableColor) {
        setSelectedColor(firstAvailableColor.color);
      }
    }
  }, [product.sizes]);

  // Effect to update selected color when size changes
  useEffect(() => {
    if (availableColors.length > 0) {
      // Check if current color is still available
      const isCurrentColorAvailable = availableColors.some(c => c.color === selectedColor && c.quantity > 0);
      if (!isCurrentColorAvailable) {
        // If current color is not available for new size, pick the first available one
        const firstAvailable = availableColors.find(c => c.quantity > 0);
        setSelectedColor(firstAvailable?.color);
      }
    } else {
      setSelectedColor(undefined);
    }
  }, [availableColors, selectedColor]);

  const selectedVariant = useMemo(() => {
    if (!selectedSize || !selectedColor) return null;
    const sizeData = product.sizes.find(s => s.size === selectedSize);
    return sizeData?.variants.find(v => v.color === selectedColor) || null;
  }, [selectedSize, selectedColor, product.sizes]);

  const isOutOfStock = !selectedVariant || selectedVariant.quantity <= 0;

  const handleAddToCart = () => {
    if (!selectedSize || !selectedColor) {
        toast({
            variant: "destructive",
            title: "Selection Needed",
            description: "Please select a size and color.",
        });
        return;
    }
    if (isOutOfStock) {
        toast({
            variant: "destructive",
            title: "Out of Stock",
            description: "This combination is currently unavailable.",
        });
        return;
    }
    addToCart({
      product,
      size: selectedSize,
      color: selectedColor,
      quantity: 1, // Add one item at a time
    });
  };

  const handleWishlistToggle = () => {
    if (inWishlist) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out this awesome shirt: ${product.name}`,
          url: window.location.href,
        });
        toast({ title: "Shared successfully!" });
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') return;
        console.error("Error sharing:", error);
        toast({ variant: "destructive", title: "Could not share" });
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: "Link Copied!", description: "Product link copied to your clipboard." });
      } catch (err) {
         toast({ variant: "destructive", title: "Could not copy link" });
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Label className="mb-2 block font-semibold">Size</Label>
        <RadioGroup
          value={selectedSize}
          onValueChange={setSelectedSize}
          className="flex flex-wrap gap-2"
        >
          {product.sizes.map((sizeInfo) => {
            const isSizeDisabled = sizeInfo.variants.every(v => v.quantity <= 0);
            return (
              <Label
                key={sizeInfo.size}
                htmlFor={`size-${sizeInfo.size}`}
                className={cn(
                  "flex h-10 cursor-pointer items-center justify-center rounded-md border-2 border-border p-2 px-4 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  selectedSize === sizeInfo.size && "border-primary bg-primary/10 text-primary",
                  isSizeDisabled && "cursor-not-allowed bg-muted/50 text-muted-foreground line-through hover:bg-muted/50"
                )}
              >
                <RadioGroupItem value={sizeInfo.size} id={`size-${sizeInfo.size}`} className="sr-only" disabled={isSizeDisabled} />
                <span className="font-medium">{sizeInfo.size}</span>
              </Label>
            )
          })}
        </RadioGroup>
      </div>
      
      {selectedSize && (
        <div>
          <Label className="mb-2 block font-semibold">Color</Label>
          <RadioGroup
            value={selectedColor}
            onValueChange={setSelectedColor}
            className="flex flex-wrap gap-2"
          >
            {availableColors.map((variant) => {
              const isColorDisabled = variant.quantity <= 0;
              return(
                <Label
                  key={variant.color}
                  htmlFor={`color-${variant.color}`}
                  className={cn(
                    "flex h-auto min-h-10 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-border p-2 px-4 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                    selectedColor === variant.color && "border-primary bg-primary/10 text-primary",
                    isColorDisabled && "cursor-not-allowed bg-muted/50 text-muted-foreground line-through hover:bg-muted/50"
                  )}
                >
                  <RadioGroupItem value={variant.color} id={`color-${variant.color}`} className="sr-only" disabled={isColorDisabled} />
                  <span className="font-medium">{variant.color}</span>
                   <span className={cn("text-xs", 
                      !isColorDisabled && "text-muted-foreground",
                      selectedColor === variant.color && "text-primary"
                  )}>
                    {variant.quantity > 0 ? `${variant.quantity} left` : 'Sold Out'}
                  </span>
                </Label>
              )
            })}
          </RadioGroup>
        </div>
      )}

      <div className="flex gap-4">
        <Button size="lg" className="flex-grow bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleAddToCart} disabled={isOutOfStock}>
          {isOutOfStock ? "Out of Stock" : <><ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart</>}
        </Button>
        <Button size="icon" variant="outline" className="h-12 w-12" onClick={handleShare}>
          <Share2 className="h-5 w-5" />
        </Button>
        <Button size="icon" variant="outline" className="h-12 w-12" onClick={handleWishlistToggle}>
          <Heart className={cn("h-5 w-5", inWishlist && "fill-red-500 text-red-500")} />
        </Button>
      </div>
    </div>
  );
}
