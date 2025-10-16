
'use client';

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type AverageRatingProps = {
    averageRating: number;
    totalReviews: number;
    size?: 'sm' | 'md' | 'lg';
}

export function AverageRating({ averageRating, totalReviews, size = 'md' }: AverageRatingProps) {
    
    const starSizeClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

    if (totalReviews === 0) {
        return (
             <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} className={cn(starSizeClass, "text-gray-300")} />
                    ))}
                </div>
                <span className="text-sm text-muted-foreground">No reviews yet</span>
            </div>
        )
    }

    const fullStars = Math.floor(averageRating);
    const halfStar = averageRating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5" title={`${averageRating} out of 5 stars`}>
                {[...Array(fullStars)].map((_, i) => (
                    <Star key={`full-${i}`} className={cn(starSizeClass, "fill-yellow-400 text-yellow-400")} />
                ))}
                {halfStar && (
                     <Star key="half" className={cn(starSizeClass, "fill-yellow-400 text-yellow-400")} style={{ clipPath: 'inset(0 50% 0 0)'}} />
                )}
                {[...Array(emptyStars)].map((_, i) => (
                    <Star key={`empty-${i}`} className={cn(starSizeClass, "text-gray-300")} />
                ))}
            </div>
            <span className="text-sm text-muted-foreground">({totalReviews} review{totalReviews > 1 ? 's' : ''})</span>
        </div>
    );
}
