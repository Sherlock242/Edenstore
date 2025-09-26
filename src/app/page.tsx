
import { getProducts } from '@/app/actions';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default async function Home() {
  const products = await getProducts();
  const newReleases = [...products].sort(
    (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
  );
  const popular = [...products].sort((a, b) => b.popularity - a.popularity);
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-1');

  return (
    <div className="flex flex-col gap-16 md:gap-24">
      <section className="relative h-[60vh] w-full text-white">
        {heroImage && (
            <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                fill
                className="object-cover"
                priority
                data-ai-hint={heroImage.imageHint}
            />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6 text-center">
          <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            Wear Your Universe
          </h1>
          <p className="max-w-[700px] text-lg text-gray-300 md:text-xl">
            Discover exclusive anime-inspired t-shirts that bring your favorite
            characters and stories to life.
          </p>
          <div>
            <Button asChild size="lg" className="bg-yellow-500 text-black hover:bg-yellow-600">
              <Link href="#new-releases">Shop Now</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="new-releases" className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-headline text-3xl font-bold tracking-tighter md:text-4xl">
            New Releases
          </h2>
          <Button variant="link" asChild>
            <Link href="/products">View All</Link>
          </Button>
        </div>
        <Carousel
          opts={{
            align: 'start',
          }}
          className="w-full"
        >
          <CarouselContent>
            {newReleases.map((product) => (
              <CarouselItem
                key={product.id}
                className="md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
              >
                <div className="p-1">
                  <ProductCard product={product} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext className="hidden sm:flex" />
        </Carousel>
      </section>

      <section id="popular" className="container mx-auto px-4 pb-16">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-headline text-3xl font-bold tracking-tighter md:text-4xl">
            Most Popular
          </h2>
          <Button variant="link" asChild>
            <Link href="/products?sort=popular">View All</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {popular.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
