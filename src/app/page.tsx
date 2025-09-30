// src/app/page.tsx
'use client';
import React from 'react';
import { getProducts } from '@/app/actions';
import { ProductCard } from '@/components/product-card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';

// This is now a client component because the carousel with autoplay needs it.
// We can fetch initial data on the server and pass it down, but for simplicity,
// we'll fetch on the client for now. If this were a real app, we'd use
// a server component to fetch and pass to this client component.
export default function Home() {
  const [products, setProducts] = React.useState<Awaited<ReturnType<typeof getProducts>>>([]);
  
  React.useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const carouselImages = [
    { id: 'carousel-1', title: 'Summer Sale', subtitle: 'Up to 50% Off On All T-Shirts', buttonText: 'Shop Now', hint: 'anime character' },
    { id: 'carousel-2', title: 'New Arrivals', subtitle: 'Check Out The Latest Drops', buttonText: 'Explore', hint: 'sci-fi city' },
    { id: 'carousel-3', title: 'Free Shipping', subtitle: 'On Orders Over ₹1000', buttonText: 'Learn More', hint: 'fantasy landscape' },
  ].map(item => {
    const placeholder = PlaceHolderImages.find(p => p.id === item.id);
    return { ...item, ...placeholder };
  });

  return (
    <div className="flex flex-col gap-16 md:gap-24">
      <section className="relative h-[60vh] md:h-[75vh] w-full text-white">
        <Carousel
          className="h-full w-full"
          plugins={[Autoplay({ delay: 5000, stopOnInteraction: false })]}
          opts={{ loop: true }}
        >
          <CarouselContent className="h-full">
            {carouselImages.map((item, index) => (
              <CarouselItem key={index} className="h-full">
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt={item.description || item.title}
                    fill
                    className="object-cover"
                    priority={index === 0}
                    data-ai-hint={item.hint}
                  />
                )}
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6 text-center px-4">
                    <h1 className="text-4xl md:text-6xl font-extrabold font-headline tracking-tighter drop-shadow-lg">
                        {item.title}
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground bg-black/30 px-4 py-2 rounded-md backdrop-blur-sm">
                        {item.subtitle}
                    </p>
                    <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                        <Link href="/products">{item.buttonText}</Link>
                    </Button>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </section>

      <section id="products" className="container mx-auto px-4 pb-16">
        <div className="mb-12 text-center">
            <h2 className="font-headline text-3xl font-bold tracking-tighter md:text-4xl">Featured Products</h2>
            <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">Hand-picked collection of our best-selling anime apparel.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
          {products.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {products.length > 8 && (
             <div className="mt-12 text-center">
                <Button asChild size="lg" variant="outline">
                    <Link href="/products">View All Products</Link>
                </Button>
            </div>
        )}
      </section>
    </div>
  );
}
