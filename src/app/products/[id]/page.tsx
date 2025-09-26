
import { getProducts } from "@/app/actions";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Star } from "lucide-react";
import { ProductDetailsClient } from "@/components/product-details-client";
import { ProductCard } from "@/components/product-card";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const products = await getProducts();
  const product = products.find((p) => p.id === params.id);

  if (!product) {
    notFound();
  }

  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="flex items-center justify-center">
            <Image
                src={product.images[0].url}
                alt={product.name}
                width={500}
                height={625}
                className="rounded-lg object-cover shadow-2xl"
                data-ai-hint={product.images[0].hint}
            />
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="font-headline text-3xl font-bold tracking-tighter md:text-4xl">
            {product.name}
          </h1>
          <div className="flex items-center gap-4">
            <Badge>{product.category}</Badge>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-2 text-sm text-muted-foreground">(123 reviews)</span>
            </div>
          </div>
          <p className="text-3xl font-bold">${product.price.toFixed(2)}</p>
          <ProductDetailsClient product={product} />
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="description">
              <AccordionTrigger>Description</AccordionTrigger>
              <AccordionContent>{product.description}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="details">
              <AccordionTrigger>Product Details</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc space-y-2 pl-4">
                  <li>100% premium cotton for ultimate comfort.</li>
                  <li>High-quality, vibrant print that lasts.</li>
                  <li>Unisex fit, true to size.</li>
                  <li>Machine wash cold, tumble dry low.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
      <div className="mt-16 md:mt-24">
        <h2 className="font-headline text-2xl font-bold tracking-tighter md:text-3xl mb-8">
            You Might Also Like
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map(p => (
                <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </div>
    </div>
  );
}

export async function generateStaticParams() {
    const products = await getProducts();
    return products.map((product) => ({
      id: product.id,
    }));
}
