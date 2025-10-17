
"use client";
import { useState, useEffect } from "react";
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
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes.find(s => s.quantity > 0)?.size
  );
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [isOutOfStock, setIsOutOfStock] = useState(false);

  const { addToCart } = useCart();
  const { dispatch: wishlistDispatch, isInWishlist } = useWishlist();
  const { toast } = useToast();
  const inWishlist = isInWishlist(product.id);

   useEffect(() => {
    if (selectedSize) {
      const sizeInfo = product.sizes.find(s => s.size === selectedSize);
      setIsOutOfStock(sizeInfo ? sizeInfo.quantity <= 0 : true);
    } else {
      // If no size is selected (e.g., all are out of stock initially)
      setIsOutOfStock(true);
    }
  }, [selectedSize, product.sizes]);

  const handleAddToCart = () => {
    if (!selectedSize) {
        toast({
            variant: "destructive",
            title: "Selection Needed",
            description: "Please select a size before adding to cart.",
        });
        return;
    }
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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out this awesome t-shirt: ${product.name}`,
          url: window.location.href,
        });
        toast({ title: "Shared successfully!" });
      } catch (error) {
        // This is expected if the user cancels the share dialog
        if ((error as DOMException).name === 'AbortError') {
          return;
        }
        console.error("Error sharing:", error);
        toast({
          variant: "destructive",
          title: "Could not share",
          description: "Something went wrong while trying to share.",
        });
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: "Link Copied!", description: "Product link copied to your clipboard." });
      } catch (err) {
         toast({
          variant: "destructive",
          title: "Could not copy link",
          description: "Please copy the link from the address bar.",
        });
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
            const isSelected = selectedSize === sizeInfo.size;
            const isSizeDisabled = sizeInfo.quantity <= 0;
            const isLowStock = sizeInfo.quantity > 0 && sizeInfo.quantity <= 5;

            return (
              <Label
                key={sizeInfo.size}
                htmlFor={`size-${sizeInfo.size}`}
                className={cn(
                  "flex h-auto min-h-10 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-border p-2 px-4 transition-colors hover:bg-accent hover:text-accent-foreground",
                  isSelected && "border-primary bg-primary/10 text-primary",
                  isSizeDisabled && "cursor-not-allowed bg-muted/50 text-muted-foreground line-through hover:bg-muted/50"
                )}
              >
                <RadioGroupItem value={sizeInfo.size} id={`size-${sizeInfo.size}`} className="sr-only" disabled={isSizeDisabled} />
                <span className="font-medium">{sizeInfo.size}</span>
                <span className={cn("text-xs", 
                    isLowStock && "text-destructive",
                    !isSizeDisabled && "text-muted-foreground",
                    isSelected && "text-primary"
                )}>
                  {sizeInfo.quantity > 0 ? `${sizeInfo.quantity} left` : 'Sold Out'}
                </span>
              </Label>
            )
          })}
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
        <Button size="lg" className="flex-grow bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleAddToCart} disabled={isOutOfStock}>
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
