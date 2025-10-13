
'use client';

import * as React from "react"
import Image from "next/image"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import { type Product } from "@/app/actions";

type ProductImageCarouselProps = {
  images: Product['images'];
  productName: string;
}

export function ProductImageCarousel({ images, productName }: ProductImageCarouselProps) {
  return (
    <Carousel className="w-full max-w-md mx-auto">
      <CarouselContent>
        {images.map((image, index) => (
          <CarouselItem key={index}>
            <div className="aspect-[4/5] relative">
              <Image
                src={image.url}
                alt={`${productName} - image ${index + 1}`}
                fill
                className="object-cover rounded-lg shadow-2xl"
                data-ai-hint={image.hint}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  )
}
