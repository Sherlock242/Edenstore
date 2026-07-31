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
import { useState, useEffect, useTransition, useMemo } from 'react';
import { createRazorpayOrder, verifyPaymentAndCreateOrder, fetchShippingRatesAction, validateCoupon } from './actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, CreditCard, Tag, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { getSiteNameClient } from '@/app/server-actions';
import { cn } from '@/lib/utils';

export default function CheckoutPage() {
  const { state, dispatch } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [siteName, setSiteName] = useState('ANISTORE');
  
  // State for shipping information
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [country, setCountry] = useState('India');
  const [phone, setPhone] = useState('');

  // State for shipping cost
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [isFetchingRate, startFetchingRateTransition] = useTransition();
  const [rateError, setRateError] = useState<string | null>(null);
  
  // State for coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [isApplyingCoupon, startCouponTransition] = useTransition();


  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        setEmail(user.email || '');
      }
    });

    getSiteNameClient().then(setSiteName);

  }, []);
  
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

  const subtotal = useMemo(() => state.items.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  ), [state.items]);
  
  const total = useMemo(() => subtotal - discount + (shippingCost || 0), [subtotal, discount, shippingCost]);

 const handleApplyCoupon = () => {
    if (!couponCode) return;
    startCouponTransition(async () => {
      const result = await validateCoupon(couponCode);
      if (result.success && result.discountPercent) {
        const newDiscount = subtotal * (result.discountPercent / 100);
        setDiscount(newDiscount);
        setAppliedCoupon(couponCode.toLowerCase());
        toast({
          title: 'Coupon Applied!',
          description: `You got a ${result.discountPercent}% discount (₹${newDiscount.toFixed(2)}).`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid Coupon',
          description: result.message,
        });
      }
    });
  };

  const handleRemoveCoupon = () => {
      setDiscount(0);
      setAppliedCoupon(null);
      setCouponCode('');
      toast({
          title: 'Coupon Removed',
          description: 'The discount has been removed from your order.'
      });
  };


  const validateForm = () => {
    if (!firstName || !address || !city || !country || !phone || !email || !pincode || !stateName) {
        toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please fill out all shipping and contact fields.',
        });
        return false;
    }
    if (shippingCost === null) {
        toast({
            variant: 'destructive',
            title: 'Shipping Not Calculated',
            description: rateError || 'Please enter a valid pincode to calculate shipping.',
        });
        return false;
    }
    return true;
  }

  const handlePlaceOrder = async () => {
    if (!validateForm() || !user) {
      if (!user) {
         toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'You must be logged in to place an order.',
        });
      }
      return;
    }

    setIsProcessing(true);
    
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
    
    const finalShippingCost = shippingCost || 0;

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!keyId) {
        toast({ variant: 'destructive', title: 'Configuration Error', description: 'Razorpay Key ID is not set.' });
        setIsProcessing(false);
        return;
    }

    const orderDetails = await createRazorpayOrder({ amount: total });
    if (!orderDetails.success || !orderDetails.order) {
        toast({ variant: 'destructive', title: 'Error', description: orderDetails.message });
        setIsProcessing(false);
        return;
    }
    
    const { order } = orderDetails;

    const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: siteName,
        description: 'Shirt Purchase',
        order_id: order.id,
        handler: async function (response: any) {
             const verificationResult = await verifyPaymentAndCreateOrder({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                shippingAddress: shippingAddress,
                totalAmount: total,
                shippingCost: finalShippingCost,
                couponCode: appliedCoupon,
                discountAmount: discount,
             });

            if (verificationResult.success) {
                toast({ title: 'Payment Successful!', description: 'Your order has been placed.' });
                dispatch({ type: 'SET_ITEMS', payload: [] });
                router.push('/my-orders');
            } else {
                 toast({ variant: 'destructive', title: 'Order Failed', description: verificationResult.message });
            }
        },
        modal: {
            ondismiss: function() {
                setIsProcessing(false);
                toast({ title: "Payment Cancelled", description: "You closed the payment window." });
            }
        },
        prefill: {
            name: `${firstName} ${lastName}`,
            email: email,
            contact: phone,
        },
        theme: { color: '#DC2626' },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', function (response: any) {
        toast({ variant: 'destructive', title: 'Payment Failed', description: response.error.description });
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
                  <Input id="country" placeholder="India" value={country} onChange={(e) => setCountry(e.target.value)} required/>
                </div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-start gap-4 rounded-lg border p-4 transition border-primary">
                        <CreditCard className="h-6 w-6 mt-1"/>
                        <div>
                            <h3 className="font-semibold">Pay Online</h3>
                            <p className="text-sm text-muted-foreground">Use Razorpay for a secure payment with card, UPI, or net banking.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Button size="lg" className="w-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-opacity" onClick={handlePlaceOrder} disabled={isProcessing || isFetchingRate}>
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
                            <div className="relative w-16 h-20 flex-shrink-0">
                                <Image 
                                    src={item.product.images[0].url} 
                                    alt={item.product.name} 
                                    fill
                                    className="rounded-md object-cover" 
                                    data-ai-hint={item.product.images[0].hint} 
                                />
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
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-500">
                        <span>Discount ({appliedCoupon})</span>
                        <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
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

                <Separator className="my-4" />

                <div>
                    {appliedCoupon ? (
                        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-green-500/10">
                            <p className="text-sm font-semibold text-green-500">Coupon "{appliedCoupon}" applied!</p>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500" onClick={handleRemoveCoupon}>
                                <X className="h-4 w-4"/>
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="relative flex-grow">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Coupon Code" 
                                    className="pl-9" 
                                    value={couponCode} 
                                    onChange={(e) => setCouponCode(e.target.value)}
                                    disabled={isApplyingCoupon}
                                />
                            </div>
                            <Button onClick={handleApplyCoupon} disabled={isApplyingCoupon}>
                                {isApplyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                            </Button>
                        </div>
                    )}
                </div>

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
