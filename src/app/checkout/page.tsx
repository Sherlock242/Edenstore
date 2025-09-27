// src/app/checkout/page.tsx
'use client';

import { useCart } from '@/contexts/cart-context';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Script from 'next/script';
import { useState } from 'react';
import { createRazorpayOrder, verifyPayment } from './actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const { state, dispatch } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = state.items.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );
  
  // Hardcoded shipping for now, you can make this dynamic
  const shippingCost = subtotal > 50 ? 0 : 5; 
  const total = subtotal + shippingCost;


  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'You must be logged in to place an order.',
        });
        setIsProcessing(false);
        return;
    }

    // 1. Create order on Razorpay
    const orderDetails = await createRazorpayOrder({ amount: total });

    if (!orderDetails.success || !orderDetails.order) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: orderDetails.message,
        });
        setIsProcessing(false);
        return;
    }
    
    const { order } = orderDetails;

    // 2. Open Razorpay Checkout
    const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: order.amount,
        currency: order.currency,
        name: 'EdenStore',
        description: 'T-Shirt Purchase',
        order_id: order.id,
        handler: async function (response: any) {
             const verificationResult = await verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
             });

            if (verificationResult.success) {
                toast({
                    title: 'Payment Successful!',
                    description: 'Your order has been placed.',
                });
                // Here you would typically save the order to your DB and clear the cart
                // For now, we'll just clear the client-side cart
                dispatch({ type: 'SET_ITEMS', payload: [] });
                router.push('/track?order_id=' + order.id);

            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Payment Failed',
                    description: verificationResult.message,
                });
            }
        },
        prefill: {
            name: user.user_metadata?.full_name || 'John Doe',
            email: user.email,
            contact: user.phone || '9999999999',
        },
        theme: {
            color: '#F97316',
        },
    };

    const rzp = new (window as any).Razorpay(options);
    
    rzp.on('payment.failed', function (response: any) {
        toast({
            variant: 'destructive',
            title: 'Payment Failed',
            description: response.error.description,
        });
        setIsProcessing(false);
    });

    rzp.open();
    // Don't set isProcessing to false here, as the modal is now open.
    // It will be handled in the success or failure handlers.
  };

  if (state.items.length === 0 && !isProcessing) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8 text-center md:py-12">
        <h1 className="font-headline text-2xl font-bold">Your cart is empty.</h1>
        <p className="text-muted-foreground">Add items to your cart to proceed to checkout.</p>
      </div>
    );
  }

  return (
    <>
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
      />
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
                  <Input id="email" type="email" placeholder="you@example.com" defaultValue={user?.email}/>
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

            <Button size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handlePlaceOrder} disabled={isProcessing}>
               {isProcessing ? 'Processing...' : `Place Order - $${total.toFixed(2)}`}
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
                              <Image src={item.product.images[0].url} alt={item.product.name} width={64} height={80} className="rounded-md object-cover" data-ai-hint={item.product.images[0].hint} />
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
                    <span>${shippingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes</span>
                    <span className="text-muted-foreground">Calculated at next step</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
