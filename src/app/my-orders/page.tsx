'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getUserOrders, type OrderSummary } from './actions';
import { format } from 'date-fns';
import { Loader2, PackageSearch } from 'lucide-react';

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        setIsLoading(true);
        getUserOrders()
          .then(result => {
            if (result.success && result.orders) {
              setOrders(result.orders);
            } else {
              setError(result.message);
            }
          })
          .finally(() => setIsLoading(false));
      } else {
        setIsLoading(false); // Not logged in, so not loading
      }
    }
  }, [user, authLoading]);

  const getStatusInfo = (status: OrderSummary['status']) => {
    switch (status) {
      case 'processing': return { text: 'Order Placed', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
      case 'shipped': return { text: 'Shipped', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'delivered': return { text: 'Delivered', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
      default: return { text: status, color: 'bg-muted text-muted-foreground' };
    }
  }

  const calculateOrderTotal = (order: OrderSummary) => {
    return order.items.reduce((total, item) => total + (item.price_at_purchase * item.quantity), 0);
  }

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 py-8 text-center md:py-12">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center gap-4 px-4 py-8 text-center md:py-12">
        <h1 className="font-headline text-3xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You must be logged in to view your order history.</p>
        <Button asChild>
          <Link href="/login">Log In</Link>
        </Button>
      </div>
    );
  }
  
  if (error) {
     return (
        <div className="container mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center gap-4 px-4 py-8 text-center md:py-12">
            <h1 className="font-headline text-3xl font-bold text-destructive">An Error Occurred</h1>
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
        </div>
     );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="font-headline text-3xl font-bold tracking-tighter md:text-4xl">My Orders</h1>
        <p className="text-muted-foreground">View the history of all your purchases.</p>
      </div>

      {orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map(order => {
            const statusInfo = getStatusInfo(order.status);
            return (
              <Card key={order.id}>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">Order #{order.razorpay_order_id.replace('order_', '')}</CardTitle>
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
                  <Button variant="outline" asChild>
                      <Link href={`/track?order_id=${order.razorpay_order_id}`}>Track This Order</Link>
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-card p-8 text-center">
            <PackageSearch className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">No orders yet.</h2>
          <p className="text-muted-foreground">You haven't placed any orders with us. Let's change that!</p>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/products">Start Shopping</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
