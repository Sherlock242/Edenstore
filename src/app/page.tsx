
import { getProducts } from '@/app/actions';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default async function Home() {
  const products = await getProducts();
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-1');

  return (
    <div className="flex flex-col gap-16 md:gap-24">
      <section className="relative h-[45vh] md:h-[55vh] w-full text-white">
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
          <div>
            <Button asChild size="lg" className="bg-gradient-to-r from-orange-500 to-yellow-400 text-black font-bold hover:opacity-90 transition-opacity">
              <Link href="/products">Shop All</Link>
            </Button>
          </div>
        </div>
      </section>

       <section id="products" className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
