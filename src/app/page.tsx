
import { getProducts } from '@/app/actions';
import { ProductCard } from '@/components/product-card';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { getHeroImageUrl } from '@/app/admin/settings/actions';
import { cookies } from 'next/headers';

export default async function Home() {
  const cookieStore = cookies();
  const products = await getProducts(cookieStore);
  const heroImageResult = await getHeroImageUrl(cookieStore);

  let heroImageUrl = heroImageResult.success && heroImageResult.url ? heroImageResult.url : "https://images.unsplash.com/photo-1711732734189-b86588856234?q=80&w=2070&auto=format&fit=crop";
  let heroImageHint = "sung jin woo";


  return (
    <div className="flex flex-col gap-16 md:gap-24">
      <section className="relative h-[30vh] w-full text-white md:h-[30vh]">
        <Image
            src={heroImageUrl}
            alt="A dynamic anime poster for the hero section."
            fill
            className="object-cover object-top"
            priority
            data-ai-hint={heroImageHint}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-end p-4 text-center md:p-8">
        </div>
      </section>

      <section id="products" className="container mx-auto px-4 pb-16">
        
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
