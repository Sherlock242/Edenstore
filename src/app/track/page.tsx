// src/app/track/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader, Package, Truck, Calendar, Hash } from "lucide-react";
import { getOrderDetails, type OrderDetails } from "./actions";
import Image from "next/image";
import { addDays, format } from "date-fns";

export default function TrackOrderPage() {
    const searchParams = useSearchParams();
    const [orderId, setOrderId] = useState("");
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleTrackOrder = async (idToTrack: string) => {
        if (!idToTrack) {
            setIsLoading(false);
            return;
        };
        
        setIsLoading(true);
        setError(null);
        setOrder(null);

        const result = await getOrderDetails(idToTrack);

        if (result.success && result.order) {
            setOrder(result.order);
        } else {
            setError(result.message);
        }
        
        setIsLoading(false);
    }
    
    useEffect(() => {
        const orderIdFromUrl = searchParams.get('order_id');
        if (orderIdFromUrl) {
            setOrderId(orderIdFromUrl);
            handleTrackOrder(orderIdFromUrl);
        } else {
            setIsLoading(false);
        }
    }, [searchParams]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleTrackOrder(orderId);
    }
    
    const estimatedDeliveryDate = order ? addDays(new Date(order.created_at), 7) : null;

    const statusSteps = [
        { name: "Order Placed", status: "processing", icon: CheckCircle },
        { name: "Shipped", status: "shipped", icon: Truck },
        { name: "Delivered", status: "delivered", icon: CheckCircle },
    ];
    const currentStatusIndex = order ? statusSteps.findIndex(s => s.status === order.status) : -1;


    return (
        <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
            <div className="flex flex-col items-center text-center">
                 <h1 className="mb-4 font-headline text-3xl font-bold tracking-tighter md:text-4xl">
                    Track Your Order
                </h1>
                <p className="mb-8 max-w-md text-muted-foreground">
                    Enter your order ID below to check the status of your shipment.
                </p>
            </div>
           
            <Card className="max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Enter Order ID</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleFormSubmit} className="flex gap-4">
                        <Input 
                            value={orderId}
                            onChange={(e) => setOrderId(e.target.value)}
                            placeholder="Enter your Order ID"
                            className="flex-grow"
                        />
                        <Button type="submit" disabled={isLoading} className="bg-accent text-accent-foreground hover:bg-accent/90">
                            {isLoading ? 'Tracking...' : 'Track'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="mt-8">
              {isLoading ? (
                  <div className="flex justify-center items-center h-48">
                      <Loader className="h-12 w-12 animate-spin text-primary"/>
                  </div>
              ) : error ? (
                   <Card className="bg-destructive/10 border-destructive text-destructive-foreground">
                      <CardContent className="p-6 text-center">
                          <Package className="h-12 w-12 text-destructive mx-auto mb-4"/>
                          <h3 className="font-bold text-xl">Order Not Found</h3>
                          <p>Please check your order ID and try again.</p>
                      </CardContent>
                   </Card>
              ) : order ? (
                  <Card>
                      <CardHeader>
                          <CardTitle>Order Status</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-8">
                           <div className="flex flex-col sm:flex-row gap-6 items-center">
                              <Image 
                                  src={order.items[0].product.images[0].url}
                                  alt={order.items[0].product.name}
                                  width={120}
                                  height={150}
                                  className="rounded-lg object-cover"
                                  data-ai-hint={order.items[0].product.images[0].hint}
                              />
                              <div className="flex-grow space-y-2 text-center sm:text-left">
                                  <div className="flex items-center justify-center sm:justify-start gap-2">
                                    <Hash className="w-5 h-5 text-muted-foreground" />
                                    <p className="font-mono text-sm text-muted-foreground">Order ID: {order.razorpay_order_id}</p>
                                  </div>
                                  <h3 className="text-xl font-bold">{order.items.length > 1 ? `${order.items[0].product.name} and ${order.items.length - 1} other item(s)` : order.items[0].product.name}</h3>
                                  <div className="flex items-center justify-center sm:justify-start gap-2">
                                      <Calendar className="w-5 h-5 text-muted-foreground" />
                                      {estimatedDeliveryDate && (
                                        <p>Estimated Delivery: <span className="font-semibold">{format(estimatedDeliveryDate, 'MMMM dd, yyyy')}</span></p>
                                      )}
                                  </div>
                              </div>
                           </div>

                          {/* Status Timeline */}
                          <div className="relative">
                            <div className="absolute left-0 top-4 h-0.5 w-full bg-border" />
                            <div
                                className="absolute left-0 top-4 h-0.5 bg-green-500 transition-all duration-500"
                                style={{ width: `${(currentStatusIndex / (statusSteps.length - 1)) * 100}%` }}
                            />
                            <div className="flex justify-between relative">
                                {statusSteps.map((step, index) => {
                                    const isActive = index <= currentStatusIndex;
                                    const Icon = step.icon;
                                    return (
                                        <div key={step.name} className="flex flex-col items-center gap-2 z-10 w-24">
                                            <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                               <Icon className='h-5 w-5' />
                                            </div>
                                            <p className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{step.name}</p>
                                        </div>
                                    )
                                })}
                            </div>
                          </div>
                      </CardContent>
                  </Card>
              ) : null}
            </div>
        </div>
    )
}
