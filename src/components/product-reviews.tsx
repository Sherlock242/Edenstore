
'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, Send } from 'lucide-react';
import { addReview, type Review } from '@/app/reviews/actions';
import { reviewSchema } from '@/lib/zod-schemas';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Separator } from './ui/separator';
import { AverageRating } from './average-rating';

type ProductReviewsProps = {
    productId: string;
    initialReviews: Review[];
    initialAverageRating: number;
    initialTotalReviews: number;
}

export function ProductReviews({ productId, initialReviews, initialAverageRating, initialTotalReviews }: ProductReviewsProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [reviews, setReviews] = useState(initialReviews);
    const [averageRating, setAverageRating] = useState(initialAverageRating);
    const [totalReviews, setTotalReviews] = useState(initialTotalReviews);

    const form = useForm<z.infer<typeof reviewSchema>>({
        resolver: zodResolver(reviewSchema),
        defaultValues: {
            productId: productId,
            rating: 0,
            comment: '',
        },
    });

    async function onSubmit(values: z.infer<typeof reviewSchema>) {
        startTransition(async () => {
            const formData = new FormData();
            formData.append('rating', values.rating.toString());
            formData.append('comment', values.comment);
            formData.append('productId', values.productId);

            const result = await addReview(formData);
            if (result.success && result.review) {
                toast({ title: 'Review Submitted!', description: result.message });
                setReviews(prev => [result.review!, ...prev]);
                // Recalculate average rating
                const newTotal = totalReviews + 1;
                const newAverage = (averageRating * totalReviews + result.review!.rating) / newTotal;
                setTotalReviews(newTotal);
                setAverageRating(parseFloat(newAverage.toFixed(1)));
                form.reset();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Customer Reviews</CardTitle>
                <div className="mt-2">
                    <AverageRating averageRating={averageRating} totalReviews={totalReviews} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Leave a review</h3>
                         <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="rating"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Your Rating</FormLabel>
                                            <FormControl>
                                                <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={`h-7 w-7 cursor-pointer transition-colors ${field.value >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                                        onClick={() => form.setValue('rating', star, { shouldValidate: true })}
                                                    />
                                                ))}
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="comment"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Your Comment</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Share your thoughts on the product..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? 'Submitting...' : <><Send className="mr-2 h-4 w-4" /> Submit Review</>}
                                </Button>
                            </form>
                        </Form>
                    </div>

                    <div className="space-y-6">
                         <h3 className="font-semibold text-lg">What others are saying</h3>
                         {reviews.length > 0 ? (
                            <div className="max-h-[400px] overflow-y-auto pr-4 space-y-6">
                                {reviews.map((review) => (
                                    <div key={review.id} className="flex gap-4">
                                        <Avatar>
                                            <AvatarFallback>{review.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="font-semibold">{review.display_name}</p>
                                                <div className="flex items-center gap-1">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                {format(new Date(review.created_at), 'MMMM dd, yyyy')}
                                            </p>
                                            <p className="text-sm text-muted-foreground">{review.comment}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                         ) : (
                             <p className="text-sm text-muted-foreground text-center py-8">Be the first to review this product!</p>
                         )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
