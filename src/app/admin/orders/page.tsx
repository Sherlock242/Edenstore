'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ViewOrders } from '@/app/admin/orders/view-orders';
import type { FullOrderDetails } from './actions';
import { getAllOrders } from './actions';
import { Loader2, PackageSearch } from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<FullOrderDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllOrders().then(result => {
      if (result.success && result.orders) {
        setOrders(result.orders);
      } else {
        setError(result.message);
      }
      setIsLoading(false);
    });
  }, []);

  const handleStatusUpdated = (orderId: string, newStatus: FullOrderDetails['status'], updatedOrder?: FullOrderDetails) => {
    setOrders(prevOrders => prevOrders.map(order => {
      if (order.id === orderId) {
        // If the full updated order is passed, use it. Otherwise, just update the status.
        return updatedOrder || { ...order, status: newStatus };
      }
      return order;
    }));
  };

  const handleOrderDeleted = (orderId: string) => {
    setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 py-8 text-center md:py-12">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        <p className="sr-only">Loading orders...</p>
      </div>
    );
  }

  if (error) {
    return (
        <div className="container mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center gap-4 px-4 py-8 text-center md:py-12">
            <h1 className="font-headline text-3xl font-bold text-destructive">An Error Occurred</h1>
            <p className="text-muted-foreground">{error}</p>
        </div>
     );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
      <Card>
        <CardHeader>
          <CardTitle>Customer Orders</CardTitle>
          <CardDescription>View and manage all incoming orders.</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length > 0 ? (
            <ViewOrders 
              orders={orders} 
              onStatusUpdated={handleStatusUpdated} 
              onOrderDeleted={handleOrderDeleted}
            />
          ) : (
             <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-card p-8 text-center">
                <PackageSearch className="h-16 w-16 text-muted-foreground" />
                <h2 className="text-xl font-semibold">No orders yet.</h2>
                <p className="text-muted-foreground">When customers place orders, they will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
