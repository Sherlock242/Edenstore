
"use client";

import { useState, useTransition } from "react";
import type { Product } from "@/lib/placeholder-data";
import { getAiRecommendations } from "@/app/actions";
import { Button } from "./ui/button";
import { WandSparkles } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";
import { ProductCard } from "./product-card";
import { Skeleton } from "./ui/skeleton";

export function Recommendations() {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [isPending, startTransition] = useTransition();
  const [hasFetched, setHasFetched] = useState(false);

  const handleGetRecommendations = () => {
    startTransition(async () => {
      const result = await getAiRecommendations();
      setRecommendations(result);
      setHasFetched(true);
    });
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-card p-6 md:p-8">
      <div className="mb-6 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-headline text-3xl font-bold tracking-tighter text-primary md:text-4xl">
            For You
          </h2>
          <p className="text-muted-foreground">
            Personalized recommendations powered by AI.
          </p>
        </div>
        {!hasFetched && (
          <Button onClick={handleGetRecommendations} disabled={isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <WandSparkles className="mr-2 h-4 w-4" />
            {isPending ? "Generating..." : "Get Recommendations"}
          </Button>
        )}
      </div>

      <div>
        {isPending ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
             {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                    <Skeleton className="h-[300px] w-full rounded-xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-4 w-2/5" />
                    </div>
                </div>
            ))}
          </div>
        ) : hasFetched && recommendations.length > 0 ? (
          <Carousel
            opts={{ align: "start" }}
            className="w-full"
          >
            <CarouselContent>
              {recommendations.map((product) => (
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
        ) : hasFetched && recommendations.length === 0 ? (
          <div className="text-center text-muted-foreground">
            <p>Could not generate recommendations at this time. Please try again later.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
