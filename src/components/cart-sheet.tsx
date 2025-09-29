
"use client";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { useCart } from "@/contexts/cart-context";
import Image from "next/image";
import { Button } from "./ui/button";
import Link from "next/link";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";
import { Minus, Plus, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";

type CartSheetContentProps = {
  setSheetOpen: (open: boolean) => void;
};

export function CartSheetContent({ setSheetOpen }: CartSheetContentProps) {
  const { state, updateQuantity, removeFromCart } = useCart();
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const subtotal = state.items.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const handleQuantityChange = async (
    productId: string,
    size: string,
    color: string,
    quantity: number
  ) => {
    const itemId = `${productId}-${size}-${color}`;
    setUpdatingItemId(itemId);
    await updateQuantity(productId, size, color, quantity);
    setUpdatingItemId(null);
  };

  const handleRemoveItem = async (productId: string, size: string, color: string) => {
    const itemId = `${productId}-${size}-${color}`;
    setUpdatingItemId(itemId);
    await removeFromCart(productId, size, color);
    setUpdatingItemId(null);
  }

  return (
    <SheetContent className="flex w-full flex-col pr-0 sm:max-w-lg">
      <SheetHeader className="px-6">
        <SheetTitle>Shopping Cart ({state.items.length})</SheetTitle>
      </SheetHeader>
      <Separator />
      {state.loading ? (
        <div className="flex flex-grow items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : state.items.length > 0 ? (
        <>
          <ScrollArea className="flex-grow">
            <div className="flex flex-col gap-6 p-6">
              {state.items.map((item) => {
                const itemId = `${item.product.id}-${item.size}-${item.color}`;
                const isUpdating = updatingItemId === itemId;
                return (
                  <div key={itemId} className="flex gap-4">
                    <Image
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      width={80}
                      height={100}
                      className="rounded-md object-cover"
                      data-ai-hint={item.product.images[0].hint}
                    />
                    <div className="flex flex-grow flex-col justify-between">
                      <div>
                        <h3 className="font-semibold">{item.product.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.size} / {item.color}
                        </p>
                        <p className="text-sm font-medium">
                          ₹{item.product.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        {isUpdating ? (
                            <Loader2 className="h-5 w-5 animate-spin"/>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleQuantityChange(item.product.id, item.size, item.color, item.quantity - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              readOnly
                              value={item.quantity}
                              className="h-7 w-12 text-center"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleQuantityChange(item.product.id, item.size, item.color, item.quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleRemoveItem(item.product.id, item.size, item.color)} disabled={isUpdating}>
                          <Trash2 className="h-4 w-4"/>
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
          <Separator />
          <SheetFooter className="p-6">
            <div className="flex w-full flex-col gap-4">
              <div className="flex justify-between font-semibold">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Shipping and taxes will be calculated at checkout.</p>
              <Button asChild size="lg" className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white font-bold hover:opacity-90 transition-opacity" onClick={() => setSheetOpen(false)}>
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>
              <Button variant="outline" asChild onClick={() => setSheetOpen(false)}>
                  <Link href="/cart">View Cart</Link>
              </Button>
            </div>
          </SheetFooter>
        </>
      ) : (
        <div className="flex flex-grow flex-col items-center justify-center gap-4 text-center">
            <h3 className="font-semibold text-lg">Your cart is empty</h3>
            <p className="text-muted-foreground">Add some awesome anime tees to get started!</p>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setSheetOpen(false)}>
                <Link href="/products">Start Shopping</Link>
            </Button>
        </div>
      )}
    </SheetContent>
  );
}
