
"use client";

import { useCart } from "@/contexts/cart-context";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Minus, Plus, Trash2, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

export default function CartPage() {
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

  if (state.loading) {
      return (
        <div className="container mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 py-8 text-center md:py-12">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
      )
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
      <h1 className="mb-8 font-headline text-3xl font-bold tracking-tighter md:text-4xl">
        Your Cart
      </h1>
      {state.items.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <div className="flex flex-col">
                  {state.items.map((item, index) => {
                    const itemId = `${item.product.id}-${item.size}-${item.color}`;
                    const isUpdating = updatingItemId === itemId;
                    return (
                      <div key={itemId}>
                        <div className="flex items-center gap-4 p-4 md:p-6">
                          <Image
                            src={item.product.images[0].url}
                            alt={item.product.name}
                            width={100}
                            height={125}
                            className="rounded-md object-cover"
                            data-ai-hint={item.product.images[0].hint}
                          />
                          <div className="flex-grow">
                            <h3 className="font-semibold">{item.product.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {item.size} / {item.color}
                            </p>
                            <p className="text-sm font-medium">
                              ₹{item.product.price.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                             {isUpdating ? (
                                <Loader2 className="h-7 w-7 animate-spin" />
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
                                  value={item.quantity}
                                  readOnly
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
                            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => handleRemoveItem(item.product.id, item.size, item.color)} disabled={isUpdating}>
                                  <Trash2 className="mr-2 h-4 w-4"/> Remove
                            </Button>
                          </div>
                        </div>
                        {index < state.items.length - 1 && <Separator />}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-muted-foreground">Calculated at next step</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <Button asChild size="lg" className="w-full bg-gradient-to-r from-orange-600 to-yellow-500 text-white font-bold hover:opacity-90 transition-opacity">
                    <Link href="/checkout">Proceed to Checkout</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-card p-8 text-center">
          <h2 className="text-xl font-semibold">Your cart is empty.</h2>
          <p className="text-muted-foreground">Looks like you haven't added anything to your cart yet.</p>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/products">Start Shopping</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
