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
import { useState, useEffect, useTransition, useCallback } from 'react';
import { createRazorpayOrder, verifyPaymentAndCreateOrder, fetchShippingRatesAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CheckoutPage() {
  const { state, dispatch } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // State for shipping information
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');

  // State for shipping cost
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [isFetchingRate, startFetchingRateTransition] = useTransition();
  const [rateError, setRateError] = useState<string | null>(null);


  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
    }
  }, [user]);
  
  // Debounce pincode input
  useEffect(() => {
    setRateError(null);
    setShippingCost(null);

    if (pincode && pincode.length === 6) {
        const handler = setTimeout(() => {
            startFetchingRateTransition(async () => {
                const result = await fetchShippingRatesAction(pincode);
                if (result.success && result.rate !== undefined) {
                    setShippingCost(result.rate);
                    setRateError(null);
                } else {
                    setShippingCost(null);
                    setRateError(result.message);
                }
            });
        }, 500); // 500ms delay

        return () => {
            clearTimeout(handler);
        };
    }
  }, [pincode]);


  const subtotal = state.items.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );
  
  const total = subtotal + (shippingCost || 0);


  const handlePlaceOrder = async () => {
    
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!keyId) {
       toast({
            variant: 'destructive',
            title: 'Configuration Error',
            description: 'Razorpay Key ID is not set.',
        });
        return;
    }

    if (!firstName || !address || !city || !country || !phone || !email || !pincode || !stateName) {
        toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please fill out all shipping and contact fields.',
        });
        return;
    }

    if (shippingCost === null) {
        toast({
            variant: 'destructive',
            title: 'Shipping Not Calculated',
            description: rateError || 'Please enter a valid pincode to calculate shipping.',
        });
        return;
    }
    
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

    const shippingAddress = {
        firstName,
        lastName,
        address,
        city,
        state: stateName,
        pincode,
        country,
        email,
        phone,
    };

    const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'EdenStore',
        description: 'T-Shirt Purchase',
        order_id: order.id,
        handler: async function (response: any) {
             const verificationResult = await verifyPaymentAndCreateOrder({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                shippingAddress: shippingAddress
             });

            if (verificationResult.success && verificationResult.razorpayOrderId) {
                toast({
                    title: 'Payment Successful!',
                    description: 'Your order has been placed.',
                });
                // Clear the client-side cart
                dispatch({ type: 'SET_ITEMS', payload: [] });
                router.push(`/track?order_id=${verificationResult.razorpayOrderId}`);

            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Order Failed',
                    description: verificationResult.message,
                });
            }
             setIsProcessing(false);
        },
        prefill: {
            name: `${firstName} ${lastName}`,
            email: email,
            contact: phone,
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
        <div className="grid grid-cols-1 gap-8 md:gap-12 lg:grid-cols-2">
          <div className="order-last flex flex-col gap-8 lg:order-first">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required/>
                </div>
                 <div className="sm:col-span-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="Your phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required/>
                </div>
                <div>
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required/>
                </div>
                <div>
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)}/>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" placeholder="123 Anime St" value={address} onChange={(e) => setAddress(e.target.value)} required/>
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="Tokyo" value={city} onChange={(e) => setCity(e.target.value)} required/>
                </div>
                 <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" placeholder="e.g. California" value={stateName} onChange={(e) => setStateName(e.target.value)} required/>
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode / ZIP</Label>
                  <Input id="pincode" placeholder="e.g. 90210" value={pincode} onChange={(e) => setPincode(e.target.value)} required maxLength={6}/>
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" placeholder="Japan" value={country} onChange={(e) => setCountry(e.target.value)} required/>
                </div>
              </CardContent>
            </Card>

            <Button size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handlePlaceOrder} disabled={isProcessing || isFetchingRate}>
               {isProcessing ? 'Processing...' : `Place Order - ₹${total.toFixed(2)}`}
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
                            <p className="font-medium">₹{(item.product.price * item.quantity).toFixed(2)}</p>
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
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="text-right">
                        {isFetchingRate ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : rateError ? (
                            <span className="text-xs text-destructive">{rateError}</span>
                        ) : shippingCost !== null ? (
                            `₹${shippingCost.toFixed(2)}`
                        ) : (
                           <span className="text-xs text-muted-foreground">Enter pincode</span>
                        )}
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>
                         {isFetchingRate || shippingCost === null ? '...' : `₹${total.toFixed(2)}`}
                    </span>
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
