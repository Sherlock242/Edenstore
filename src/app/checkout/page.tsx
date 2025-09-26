
"use client";

import { useCart } from "@/contexts/cart-context";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function CheckoutPage() {
    const { state } = useCart();
    const subtotal = state.items.reduce(
        (acc, item) => acc + item.product.price * item.quantity,
        0
    );

    if (state.items.length === 0) {
        return (
             <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12 text-center">
                 <h1 className="font-headline text-2xl font-bold">Your cart is empty.</h1>
                 <p className="text-muted-foreground">Add items to your cart to proceed to checkout.</p>
             </div>
        )
    }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
        <h1 className="mb-8 font-headline text-3xl font-bold tracking-tighter md:text-4xl">
            Checkout
        </h1>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div className="flex flex-col gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Shipping Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                             <Label htmlFor="email">Email Address</Label>
                             <Input id="email" type="email" placeholder="you@example.com" />
                        </div>
                        <div>
                             <Label htmlFor="first-name">First Name</Label>
                             <Input id="first-name" placeholder="John" />
                        </div>
                        <div>
                             <Label htmlFor="last-name">Last Name</Label>
                             <Input id="last-name" placeholder="Doe" />
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="address">Address</Label>
                            <Input id="address" placeholder="123 Anime St" />
                        </div>
                        <div>
                            <Label htmlFor="city">City</Label>
                            <Input id="city" placeholder="Tokyo" />
                        </div>
                         <div>
                            <Label htmlFor="country">Country</Label>
                            <Input id="country" placeholder="Japan" />
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Payment Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4">
                        <div>
                            <Label htmlFor="card-number">Card Number</Label>
                            <Input id="card-number" placeholder="**** **** **** 1234" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <Label htmlFor="expiry-date">Expiry Date</Label>
                                <Input id="expiry-date" placeholder="MM/YY" />
                            </div>
                             <div>
                                <Label htmlFor="cvc">CVC</Label>
                                <Input id="cvc" placeholder="123" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                 <Button size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    Place Order - ${subtotal.toFixed(2)}
                 </Button>

            </div>
            <div className="order-first lg:order-last">
                 <Card className="sticky top-24">
                    <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible defaultValue="item-1">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>{state.items.length} items in cart</AccordionTrigger>
                                <AccordionContent>
                                    <div className="flex flex-col gap-4">
                                        {state.items.map(item => (
                                            <div key={`${item.product.id}-${item.size}-${item.color}`} className="flex items-center gap-4">
                                                <div className="relative">
                                                     <Image src={item.product.images[0].url} alt={item.product.name} width={64} height={80} className="rounded-md object-cover" data-ai-hint={item.product.images[0].hint}/>
                                                     <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{item.quantity}</span>
                                                </div>
                                                <div className="flex-grow">
                                                    <p className="font-semibold">{item.product.name}</p>
                                                    <p className="text-sm text-muted-foreground">{item.size} / {item.color}</p>
                                                </div>
                                                <p className="font-medium">${(item.product.price * item.quantity).toFixed(2)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                        <Separator className="my-4" />
                        <div className="space-y-2">
                             <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Shipping</span>
                                <span>$0.00</span>
                            </div>
                             <div className="flex justify-between">
                                <span>Taxes</span>
                                <span>$0.00</span>
                            </div>
                            <Separator className="my-2"/>
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardContent>
                 </Card>
            </div>
        </div>
    </div>
  )
}
