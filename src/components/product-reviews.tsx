'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, Send, Edit, Trash2, LogIn } from 'lucide-react';
import { addReview, updateReview, deleteReview, type Review } from '@/app/reviews/actions';
import { reviewSchema } from '@/lib/zod-schemas';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AverageRating } from './average-rating';
import { useUser } from '@/hooks/use-user.tsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

type ProductReviewsProps = {
    productId: string;
    initialReviews: Review[];
    initialAverageRating: number;
    initialTotalReviews: number;
}

export function ProductReviews({ productId, initialReviews, initialAverageRating, initialTotalReviews }: ProductReviewsProps) {
    const { toast } = useToast();
    const { user, loading: userLoading } = useUser();
    const [isPending, startTransition] = useTransition();
    const [reviews, setReviews] = useState(initialReviews);
    const [averageRating, setAverageRating] = useState(initialAverageRating);
    const [totalReviews, setTotalReviews] = useState(initialTotalReviews);
    
    const [reviewToEdit, setReviewToEdit] = useState<Review | null>(null);
    const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

    const userReview = reviews.find(r => r.user_id === user?.id);
    const isFormVisible = user && (!userReview || reviewToEdit);

    const form = useForm<z.infer<typeof reviewSchema>>({
        resolver: zodResolver(reviewSchema),
        defaultValues: {
            productId: productId,
            rating: 0,
            comment: '',
        },
    });
    
    useEffect(() => {
        // If user has a review, or is editing one, pre-populate the form
        const targetReview = reviewToEdit || userReview;
        if (targetReview) {
            form.reset({
                productId: productId,
                rating: targetReview.rating,
                comment: targetReview.comment,
            });
        } else {
             form.reset({ productId: productId, rating: 0, comment: '' });
        }
    }, [userReview, reviewToEdit, form, productId]);

    async function onSubmit(values: z.infer<typeof reviewSchema>) {
        startTransition(async () => {
            const formData = new FormData();
            formData.append('rating', values.rating.toString());
            formData.append('comment', values.comment);
            formData.append('productId', values.productId);

            let result;
            if (reviewToEdit) {
                 formData.append('reviewId', reviewToEdit.id);
                 result = await updateReview(formData);
            } else {
                result = await addReview(formData);
            }
           
            if (result.success && result.review) {
                toast({ title: result.message });
                // If editing, replace the old review. If adding, prepend the new one.
                if (reviewToEdit) {
                    setReviews(prev => prev.map(r => r.id === result.review!.id ? result.review! : r));
                } else {
                    setReviews(prev => [result.review!, ...prev]);
                }
                
                // Recalculate average (simplified - full recalc is better)
                const newTotal = reviewToEdit ? totalReviews : totalReviews + 1;
                const updatedReviews = reviewToEdit ? reviews.map(r => r.id === result.review!.id ? result.review! : r) : [result.review, ...reviews];
                const newSum = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
                const newAverage = newSum / newTotal;

                setTotalReviews(newTotal);
                setAverageRating(parseFloat(newAverage.toFixed(1)));
                setReviewToEdit(null);
                form.reset({ productId: productId, rating: 0, comment: '' });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    }

    const handleEditClick = (review: Review) => {
        setReviewToEdit(review);
    }
    
    const handleDeleteClick = (review: Review) => {
        setReviewToDelete(review);
        setIsDeleteAlertOpen(true);
    }

    const handleConfirmDelete = async () => {
        if (!reviewToDelete) return;
        
        startTransition(async () => {
            const result = await deleteReview(reviewToDelete.id, productId);
            if (result.success) {
                toast({ title: 'Review Deleted', description: result.message });
                const updatedReviews = reviews.filter(r => r.id !== reviewToDelete.id);
                setReviews(updatedReviews);

                // Recalculate average
                const newTotal = totalReviews - 1;
                if (newTotal > 0) {
                    const newSum = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
                    const newAverage = newSum / newTotal;
                    setAverageRating(parseFloat(newAverage.toFixed(1)));
                } else {
                    setAverageRating(0);
                }
                setTotalReviews(newTotal);

            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
            setIsDeleteAlertOpen(false);
            setReviewToDelete(null);
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
                         {userLoading ? (
                            <div className="space-y-6">
                                <h3 className="font-semibold text-lg">Leave a review</h3>
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-1/3" />
                                    <Skeleton className="h-7 w-1/2" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-1/3" />
                                    <Skeleton className="h-20 w-full" />
                                </div>
                                <Skeleton className="h-10 w-32" />
                            </div>
                         ) : isFormVisible ? (
                            <>
                                <h3 className="font-semibold text-lg">{reviewToEdit ? "Edit Your Review" : "Leave a review"}</h3>
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
                                        <div className="flex items-center gap-4">
                                            <Button type="submit" disabled={isPending}>
                                                {isPending ? (reviewToEdit ? 'Updating...' : 'Submitting...') : <><Send className="mr-2 h-4 w-4" /> {reviewToEdit ? 'Update Review' : 'Submit Review'}</>}
                                            </Button>
                                            {reviewToEdit && (
                                                <Button variant="ghost" onClick={() => setReviewToEdit(null)}>Cancel</Button>
                                            )}
                                        </div>
                                    </form>
                                </Form>
                            </>
                         ) : user ? (
                             userReview && !reviewToEdit && (
                                 <div className="p-4 rounded-lg bg-muted/50 text-center">
                                     <p className="font-semibold">You've already reviewed this product.</p>
                                     <p className="text-sm text-muted-foreground">You can edit or delete your review from the list.</p>
                                 </div>
                             )
                         ) : (
                            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center h-full">
                                <h3 className="text-lg font-semibold">Want to share your opinion?</h3>
                                <p className="text-sm text-muted-foreground">Sign in to leave a review and help others.</p>
                                <Button asChild>
                                    <Link href="/login">
                                        <LogIn className="mr-2 h-4 w-4" />
                                        Log in to Leave a Review
                                    </Link>
                                </Button>
                            </div>
                         )}
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
                                                <div className="flex items-center gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={cn("h-4 w-4", i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300')} />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                {format(new Date(review.created_at), 'MMMM dd, yyyy')}
                                            </p>
                                            <p className="text-sm text-muted-foreground">{review.comment}</p>
                                            {user?.id === review.user_id && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(review)} disabled={isPending}>
                                                        <Edit className="h-4 w-4 mr-1" /> Edit
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(review)} disabled={isPending}>
                                                         <Trash2 className="h-4 w-4 mr-1" /> Delete
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                         ) : (
                             <p className="text-sm text-muted-foreground text-center py-8">Be the first to review this product!</p>
                         )}
                    </div>
                </div>

                <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete your review. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setReviewToDelete(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmDelete} disabled={isPending}>
                                {isPending ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </CardContent>
        </Card>
    );
}
