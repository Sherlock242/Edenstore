
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader, Package, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type OrderStatus = "not_found" | "processing" | "shipped" | "delivered";

type Order = {
  id: string;
  status: OrderStatus;
  created_at: string;
  total_amount: number;
}

export default function TrackOrderPage() {
    const searchParams = useSearchParams();
    const [orderId, setOrderId] = useState("");
    const [order, setOrder] = useState<Order | null>(null);
    const [status, setStatus] = useState<OrderStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const orderIdFromUrl = searchParams.get('order_id');
        if (orderIdFromUrl) {
            setOrderId(orderIdFromUrl);
            handleTrackOrder(null, orderIdFromUrl);
        }
    }, [searchParams]);

    const handleTrackOrder = async (e: React.FormEvent | null, idToTrack?: string) => {
        if (e) e.preventDefault();
        const currentOrderId = idToTrack || orderId;
        if (!currentOrderId) return;
        
        setIsLoading(true);
        setStatus(null);
        setOrder(null);

        const supabase = createClient();
        const { data, error } = await supabase
            .from('orders')
            .select('id, status, created_at, total_amount')
            .eq('id', currentOrderId)
            .single();

        if (error || !data) {
            setStatus("not_found");
        } else {
            setOrder(data as Order);
            setStatus(data.status as OrderStatus);
        }
        
        setIsLoading(false);
    }

    const getStatusComponent = () => {
        if (isLoading) {
            return (
                 <div className="flex flex-col items-center gap-4 text-center">
                    <Loader className="h-12 w-12 animate-spin text-primary"/>
                    <p>Searching for your order...</p>
                 </div>
            )
        }

        switch (status) {
            case "processing":
                return (
                    <div className="flex flex-col items-center gap-4 text-center">
                        <Loader className="h-12 w-12 text-blue-500"/>
                        <h3 className="font-bold text-xl">Processing</h3>
                        <p className="text-muted-foreground">Your order is being prepared for shipment.</p>
                    </div>
                )
             case "shipped":
                return (
                    <div className="flex flex-col items-center gap-4 text-center">
                        <Truck className="h-12 w-12 text-yellow-500"/>
                        <h3 className="font-bold text-xl">Shipped</h3>
                        <p className="text-muted-foreground">Your order is on its way to you!</p>
                    </div>
                )
             case "delivered":
                return (
                    <div className="flex flex-col items-center gap-4 text-center">
                        <CheckCircle className="h-12 w-12 text-green-500"/>
                        <h3 className="font-bold text-xl">Delivered</h3>
                        <p className="text-muted-foreground">Your order has arrived. Enjoy!</p>
                    </div>
                )
             case "not_found":
                return (
                    <div className="flex flex-col items-center gap-4 text-center">
                        <Package className="h-12 w-12 text-destructive"/>
                        <h3 className="font-bold text-xl">Order Not Found</h3>
                        <p className="text-muted-foreground">Please check your order ID and try again.</p>
                    </div>
                )
            default:
                return null;
        }
    }

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
            <div className="flex flex-col items-center text-center">
                 <h1 className="mb-4 font-headline text-3xl font-bold tracking-tighter md:text-4xl">
                    Track Your Order
                </h1>
                <p className="mb-8 max-w-md text-muted-foreground">
                    Enter your order ID below to check the status of your shipment.
                </p>
            </div>
           
            <Card>
                <CardHeader>
                    <CardTitle>Enter Order ID</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleTrackOrder} className="flex gap-4">
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

            {status && (
                 <div className="mt-8 rounded-lg bg-card p-8">
                    {getStatusComponent()}
                </div>
            )}
        </div>
    )
}
