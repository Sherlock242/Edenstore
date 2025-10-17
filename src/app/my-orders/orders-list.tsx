
'use client';

import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';
import type { OrderSummary } from './actions';
import { Milestone, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

type OrdersListProps = {
    orders: OrderSummary[];
}

export function OrdersList({ orders }: OrdersListProps) {
    
    const getStatusInfo = (status: OrderSummary['status']) => {
        switch (status) {
          case 'pending-shipment': return { text: 'Order Placed', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
          case 'processing': return { text: 'Processing', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
          case 'shipped': return { text: 'Shipped', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
          case 'delivered': return { text: 'Delivered', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
          case 'processing-error': return { text: 'Processing Error', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
          default: return { text: status, color: 'bg-muted text-muted-foreground' };
        }
    }
    
    return (
        <div className="space-y-6">
          {orders.map(order => {
            const statusInfo = getStatusInfo(order.status);
            const trackingDetails = order.tracking_data?.tracking_data;
            const trackingHistory = trackingDetails?.shipment_track_activities?.slice().reverse() || [];
            const awbCode = trackingDetails?.awb_code;

            return (
              <Card key={order.id}>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">Order #{order.razorpay_order_id.replace('order_', '').replace('cod_','')}</CardTitle>
                    <CardDescription>
                      Placed on {format(new Date(order.created_at), 'MMMM dd, yyyy')}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                      <Badge variant="outline" className={`capitalize ${statusInfo.color}`}>{statusInfo.text}</Badge>
                      <div className="text-lg font-bold">
                          Total: ₹{order.total_amount.toFixed(2)}
                      </div>
                  </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 mb-4">
                        {order.items.map(item => (
                        <div key={`${item.product.id}-${item.size}-${item.color}`} className="flex items-center gap-4">
                            <Image
                            src={item.product.images[0].url}
                            alt={item.product.name}
                            width={64}
                            height={80}
                            className="rounded-md object-cover"
                            />
                            <div className="flex-grow">
                                <p className="font-semibold">{item.product.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {item.quantity} x ₹{item.price_at_purchase.toFixed(2)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {item.size} / {item.color}
                                </p>
                            </div>
                            <p className="font-medium">₹{(item.price_at_purchase * item.quantity).toFixed(2)}</p>
                        </div>
                        ))}
                    </div>
                    { (order.discount_amount && order.discount_amount > 0) && (
                        <>
                            <Separator className="my-4" />
                            <div className="flex justify-between text-sm text-green-500">
                                <p>Discount ({order.coupon_code})</p>
                                <p>-₹{order.discount_amount.toFixed(2)}</p>
                            </div>
                        </>
                    )}

                  <Accordion type="multiple">
                      {order.shipment_id && (
                        <AccordionItem value="tracking">
                            <AccordionTrigger>Tracking Details</AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-2 mb-6 text-sm">
                                  <p className="text-muted-foreground">Shipment ID: <span className="font-medium text-foreground">{order.shipment_id}</span></p>
                                  <p className="text-muted-foreground">AWB Number: <span className="font-medium text-foreground">{awbCode || "Not yet assigned"}</span></p>
                                </div>
                                <div className="space-y-6">
                                {trackingHistory.length > 0 ? (
                                    <div className="relative pl-6">
                                        <div className="absolute left-[9px] top-0 h-full w-0.5 bg-border -translate-x-1/2"></div>
                                        {trackingHistory.map((activity: any, index: number) => (
                                            <div key={index} className="relative flex items-start gap-6 pb-6 last:pb-0">
                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary mt-1.5 z-10 shrink-0">
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
                                    <p className="text-muted-foreground text-sm text-center py-4">No tracking history available yet. This will update once the courier scans your package.</p>
                                )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                      )}
                  </Accordion>
                </CardContent>
                {(order.status === 'pending-shipment' || (order.status === 'processing' && !order.shipment_id)) && (
                    <CardFooter>
                        <p className="text-sm text-muted-foreground">Tracking details will be available once the order is shipped.</p>
                    </CardFooter>
                )}
                {order.status === 'processing-error' && (
                     <CardFooter className="bg-destructive/10 border-t border-destructive/20 pt-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            <div className="text-sm text-destructive">
                                <p className="font-semibold">Shipment Processing Error</p>
                                <p>There was an issue communicating with the shipping provider. We are aware of the problem and will process your order manually. No action is needed from you.</p>
                            </div>
                        </div>
                    </CardFooter>
                )}
              </Card>
            )
          })}
        </div>
    )
}
