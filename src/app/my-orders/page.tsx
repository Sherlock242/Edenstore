
import { PackageSearch } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getUserOrders } from './actions';
import { OrdersList } from './orders-list';
import Link from 'next/link';
import { Button } from '@/components/ui/button';


export default async function MyOrdersPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login?message=You must be logged in to view your orders.');
  }

  const { orders, message } = await getUserOrders();

  if (!orders && message) {
     return (
        <div className="container mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center gap-4 px-4 py-8 text-center md:py-12">
            <h1 className="font-headline text-3xl font-bold text-destructive">An Error Occurred</h1>
            <p className="text-muted-foreground">{message}</p>
        </div>
     );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="font-headline text-3xl font-bold tracking-tighter md:text-4xl">My Orders</h1>
        <p className="text-muted-foreground">View the history of all your purchases.</p>
      </div>

      {orders && orders.length > 0 ? (
        <OrdersList orders={orders} />
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
