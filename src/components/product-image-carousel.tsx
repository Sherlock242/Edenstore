
'use client';

import * as React from "react"
import Image from "next/image"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { type Product } from "@/app/actions";

type ProductImageCarouselProps = {
  images: Product['images'];
  productName: string;
}

export function ProductImageCarousel({ images, productName }: ProductImageCarouselProps) {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    if (!api) {
      return
    }

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  const scrollTo = (index: number) => {
    api?.scrollTo(index);
  }

  return (
    <div className="w-full max-w-md mx-auto">
        <Carousel setApi={setApi} className="w-full">
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
        {count > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
                {Array.from({ length: count }).map((_, index) => (
                    <button
                        key={index}
                        onClick={() => scrollTo(index)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                            current === index ? 'w-4 bg-primary' : 'w-2 bg-muted-foreground/50'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        )}
    </div>
  )
}
