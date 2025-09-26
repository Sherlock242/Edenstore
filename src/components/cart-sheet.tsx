
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
import { Minus, Plus, Trash2 } from "lucide-react";

export function CartSheetContent() {
  const { state, dispatch } = useCart();

  const subtotal = state.items.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const handleQuantityChange = (
    productId: string,
    size: string,
    color: string,
    quantity: number
  ) => {
    dispatch({
      type: "UPDATE_QUANTITY",
      payload: { productId, size, color, quantity },
    });
  };
  
  const handleRemoveItem = (productId: string, size: string, color: string) => {
    dispatch({
      type: 'REMOVE_ITEM',
      payload: { productId, size, color }
    });
  }

  return (
    <SheetContent className="flex w-full flex-col pr-0 sm:max-w-lg">
      <SheetHeader className="px-6">
        <SheetTitle>Shopping Cart ({state.items.length})</SheetTitle>
      </SheetHeader>
      <Separator />
      {state.items.length > 0 ? (
        <>
          <ScrollArea className="flex-grow">
            <div className="flex flex-col gap-6 p-6">
              {state.items.map((item) => (
                <div key={`${item.product.id}-${item.size}-${item.color}`} className="flex gap-4">
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
                        ${item.product.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
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
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.product.id, item.size, item.color, parseInt(e.target.value) || 0)}
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
                       <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleRemoveItem(item.product.id, item.size, item.color)}>
                        <Trash2 className="h-4 w-4"/>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <Separator />
          <SheetFooter className="p-6">
            <div className="flex w-full flex-col gap-4">
              <div className="flex justify-between font-semibold">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Shipping and taxes will be calculated at checkout.</p>
              <Button asChild size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>
              <Button variant="outline" asChild>
                  <Link href="/cart">View Cart</Link>
              </Button>
            </div>
          </SheetFooter>
        </>
      ) : (
        <div className="flex flex-grow flex-col items-center justify-center gap-4 text-center">
            <h3 className="font-semibold text-lg">Your cart is empty</h3>
            <p className="text-muted-foreground">Add some awesome anime tees to get started!</p>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/products">Start Shopping</Link>
            </Button>
        </div>
      )}
    </SheetContent>
  );
}
