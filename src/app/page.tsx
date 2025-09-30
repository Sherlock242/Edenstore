
import { getProducts } from '@/app/actions';
import { ProductCard } from '@/components/product-card';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { getHeroImageUrl } from '@/app/admin/settings/actions';

export default async function Home() {
  const products = await getProducts();
  const heroImageResult = await getHeroImageUrl();

  let heroImageUrl = heroImageResult.success && heroImageResult.url ? heroImageResult.url : "https://images.unsplash.com/photo-1711732734189-b86588856234?q=80&w=2070&auto=format&fit=crop";
  let heroImageHint = "sung jin woo";


  return (
    <div className="flex flex-col gap-16 md:gap-24">
      <section className="relative h-[40vh] w-full text-white md:h-[50vh]">
        <Image
            src={heroImageUrl}
            alt="A dynamic anime poster for the hero section."
            fill
            className="object-cover"
            priority
            data-ai-hint={heroImageHint}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6 text-center px-4">
            <h1 className="text-4xl md:text-6xl font-extrabold font-headline tracking-tighter drop-shadow-lg">
                Your Style, Your Story
            </h1>
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                <Link href="/products">Shop Now</Link>
            </Button>
        </div>
      </section>

      <section id="products" className="container mx-auto px-4 pb-16">
        <div className="mb-12 text-center">
            <h2 className="font-headline text-3xl font-bold tracking-tighter md:text-4xl">Featured Products</h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
                Hand-picked designs that you won't find anywhere else.
            </p>
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
