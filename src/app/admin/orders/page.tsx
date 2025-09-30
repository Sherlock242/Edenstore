
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

  useEffect(() => {
    getAllOrders().then(result => {
      if (result.success && result.orders) {
        setOrders(result.orders);
      }
      setIsLoading(false);
    });
  }, []);

  const handleStatusUpdated = (orderId: string, newStatus: FullOrderDetails['status']) => {
    setOrders(prevOrders => prevOrders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 py-8 text-center md:py-12">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        <p className="sr-only">Loading orders...</p>
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
            <ViewOrders orders={orders} onStatusUpdated={handleStatusUpdated} />
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
