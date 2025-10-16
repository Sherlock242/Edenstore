
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { reviewSchema } from '@/lib/zod-schemas';


export type Review = {
    id: string;
    created_at: string;
    rating: number;
    comment: string;
    display_name: string;
    user_id: string;
}

export async function addReview(formData: FormData): Promise<{ success: boolean; message: string; review?: Review }> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: 'You must be logged in to leave a review.' };
    }
    
    const { data: userProfile } = await supabase.from('users').select('display_name').eq('id', user.id).single();

    const parsedData = reviewSchema.safeParse({
        rating: formData.get('rating'),
        comment: formData.get('comment'),
        productId: formData.get('productId'),
    });

    if (!parsedData.success) {
        return { success: false, message: parsedData.error.errors.map(e => e.message).join(', ') };
    }
    
    const { rating, comment, productId } = parsedData.data;

    const { data: newReview, error } = await supabase
        .from('reviews')
        .insert({
            product_id: productId,
            user_id: user.id,
            rating: rating,
            comment: comment,
            display_name: userProfile?.display_name || user.email,
        })
        .select()
        .single();
    
    if (error) {
        if (error.code === '23505') { // Unique constraint violation
             return { success: false, message: 'You have already reviewed this product.' };
        }
        console.error("Error adding review:", error);
        return { success: false, message: 'Failed to add review. Please try again.' };
    }

    revalidatePath(`/products/${productId}`);
    return { success: true, message: 'Thank you for your review!', review: newReview };
}


export async function getReviewsForProduct(productId: string): Promise<{ success: boolean; message: string; reviews?: Review[]; averageRating?: number; totalReviews?: number; }> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching reviews:', error);
        return { success: false, message: 'Could not fetch reviews.' };
    }

    if (!data || data.length === 0) {
        return { success: true, message: 'No reviews yet.', reviews: [], averageRating: 0, totalReviews: 0 };
    }
    
    const totalReviews = data.length;
    const averageRating = data.reduce((acc, review) => acc + review.rating, 0) / totalReviews;

    return {
        success: true,
        message: 'Reviews fetched.',
        reviews: data as Review[],
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: totalReviews,
    };
}


export async function updateReview(formData: FormData): Promise<{ success: boolean; message: string; review?: Review }> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: 'You must be logged in to update a review.' };
    }
    
    const reviewId = formData.get('reviewId') as string;
    if (!reviewId) return { success: false, message: "Review ID is missing."};

    const parsedData = reviewSchema.safeParse({
        rating: formData.get('rating'),
        comment: formData.get('comment'),
        productId: formData.get('productId'),
    });

     if (!parsedData.success) {
        return { success: false, message: parsedData.error.errors.map(e => e.message).join(', ') };
    }

    const { rating, comment, productId } = parsedData.data;

    const { data: updatedReview, error } = await supabase
        .from('reviews')
        .update({ rating, comment })
        .eq('id', reviewId)
        .eq('user_id', user.id) // Ensure user can only update their own review
        .select()
        .single();
    
    if (error) {
        console.error("Error updating review:", error);
        return { success: false, message: 'Failed to update review.' };
    }

    revalidatePath(`/products/${productId}`);
    return { success: true, message: 'Your review has been updated!', review: updatedReview };
}


export async function deleteReview(reviewId: string, productId: string): Promise<{ success: boolean, message: string }> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: 'You must be logged in to delete a review.' };
    }

    const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', user.id); // Ensure user can only delete their own review

    if (error) {
        console.error("Error deleting review:", error);
        return { success: false, message: 'Failed to delete review.' };
    }

    revalidatePath(`/products/${productId}`);
    return { success: true, message: 'Your review has been deleted.' };
}
