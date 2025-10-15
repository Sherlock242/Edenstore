
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';
import type { OrderSummary } from './actions';

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
          default: return { text: status, color: 'bg-muted text-muted-foreground' };
        }
    }

    const calculateOrderTotal = (order: OrderSummary) => {
        return order.items.reduce((total, item) => total + (item.price_at_purchase * item.quantity), 0);
    }
    
    return (
        <div className="space-y-6">
          {orders.map(order => {
            const statusInfo = getStatusInfo(order.status);
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
                          Total: ₹{calculateOrderTotal(order).toFixed(2)}
                      </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                      <AccordionItem value="items">
                          <AccordionTrigger>{order.items.length} item(s)</AccordionTrigger>
                          <AccordionContent>
                              <div className="space-y-4">
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
                          </AccordionContent>
                      </AccordionItem>
                  </Accordion>
                </CardContent>
                <CardFooter>
                    {order.shipment_id ? (
                        <Button variant="outline" asChild>
                            <Link href={`/track?shipment_id=${order.shipment_id}`}>Track This Order</Link>
                        </Button>
                    ) : (
                        <Button variant="outline" disabled>
                            Tracking Unavailable
                        </Button>
                    )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
    )
}
