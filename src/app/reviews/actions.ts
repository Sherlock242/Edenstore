
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';

export const reviewSchema = z.object({
  rating: z.coerce.number().min(1, 'Rating is required').max(5),
  comment: z.string().min(10, 'Comment must be at least 10 characters.'),
  productId: z.string(),
});

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
