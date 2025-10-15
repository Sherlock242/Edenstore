
// src/app/track/track-order-client.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader, Package, MapPin, Calendar, Milestone } from "lucide-react";
import { getOrderDetailsByShipmentId, type OrderDetails } from "./actions";
import Image from "next/image";
import { format } from "date-fns";

export function TrackOrderClient() {
    const searchParams = useSearchParams();
    const [shipmentId, setShipmentId] = useState("");
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

        const result = await getOrderDetailsByShipmentId(idToTrack);

        if (result.success && result.order) {
            setOrder(result.order);
        } else {
            setError(result.message);
        }
        
        setIsLoading(false);
    }
    
    useEffect(() => {
        const shipmentIdFromUrl = searchParams.get('shipment_id');
        if (shipmentIdFromUrl) {
            setShipmentId(shipmentIdFromUrl);
            handleTrackOrder(shipmentIdFromUrl);
        } else {
            setIsLoading(false);
        }
    }, [searchParams]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleTrackOrder(shipmentId);
    }
    
    const trackingDetails = order?.tracking_data?.tracking_data;
    const trackingHistory = trackingDetails?.shipment_track_activities || [];
    const latestActivity = trackingHistory[0];

    return (
        <>
            <Card className="max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Enter Shipment ID</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleFormSubmit} className="flex flex-col gap-4 sm:flex-row">
                        <Input 
                            value={shipmentId}
                            onChange={(e) => setShipmentId(e.target.value)}
                            placeholder="Enter your Shipment ID"
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
                          <h3 className="font-bold text-xl">Shipment Not Found</h3>
                          <p>Please check your shipment ID and try again.</p>
                      </CardContent>
                   </Card>
              ) : order ? (
                  <Card>
                      <CardHeader>
                          <CardTitle>Order #{order.razorpay_order_id.replace('order_', '').replace('cod_', 'COD-')}</CardTitle>
                          <CardDescription>
                              {trackingDetails?.awb_code ? `AWB #${trackingDetails.awb_code}` : 'Awaiting shipment details...'}
                          </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-8">
                           <div className="flex flex-col sm:flex-row gap-6 items-center border-b pb-6">
                              <Image 
                                  src={order.items[0].product.images[0].url}
                                  alt={order.items[0].product.name}
                                  width={100}
                                  height={125}
                                  className="rounded-lg object-cover"
                                  data-ai-hint={order.items[0].product.images[0].hint}
                              />
                              <div className="flex-grow space-y-2 text-center sm:text-left">
                                  <h3 className="text-xl font-bold">{order.items.length > 1 ? `${order.items[0].product.name} and ${order.items.length - 1} other item(s)` : order.items[0].product.name}</h3>
                                  <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground">
                                      <Calendar className="w-4 h-4" />
                                      <p>Placed on: <span className="font-medium text-foreground">{format(new Date(order.created_at), 'MMM dd, yyyy')}</span></p>
                                  </div>
                                  <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground">
                                      <MapPin className="w-4 h-4" />
                                      <p>Current Status: <span className="font-medium text-primary">{latestActivity?.activity || trackingDetails?.current_status || 'Processing'}</span></p>
                                  </div>
                              </div>
                           </div>

                          {/* Tracking History */}
                          <div className="space-y-6">
                            <h4 className="font-semibold text-lg">Tracking History</h4>
                            {trackingHistory.length > 0 ? (
                                <div className="relative pl-6">
                                     <div className="absolute left-[9px] top-0 h-full w-0.5 bg-border -translate-x-1/2"></div>
                                    {trackingHistory.map((activity: any, index: number) => (
                                        <div key={index} className="relative flex items-start gap-6 pb-6">
                                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary mt-1.5 z-10">
                                                <Milestone className="h-3 w-3 text-primary-foreground" />
                                            </div>
                                            <div className="flex-grow">
                                                <p className="font-semibold">{activity.activity}</p>
                                                <p className="text-sm text-muted-foreground">{activity.location}</p>
                                                <p className="text-xs text-muted-foreground">{format(new Date(activity.date), 'MMM dd, yyyy, h:mm a')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ): (
                                <p className="text-muted-foreground text-sm">No tracking history available yet. Please check back later.</p>
                            )}
                          </div>
                      </CardContent>
                  </Card>
              ) : null}
            </div>
        </>
    )
}
