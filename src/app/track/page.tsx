// src/app/track/page.tsx
import { Suspense } from 'react';
import { Loader } from 'lucide-react';
import { TrackOrderClient } from './track-order-client';

function Loading() {
  return (
    <div className="flex justify-center items-center h-48">
      <Loader className="h-12 w-12 animate-spin text-primary" />
    </div>
  )
}

export default function TrackOrderPage() {
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
      <Suspense fallback={<Loading />}>
        <TrackOrderClient />
      </Suspense>
    </div>
  );
}
