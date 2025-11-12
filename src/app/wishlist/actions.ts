
'use server';

import { createClient } from '@/lib/supabase/server';
import type { Product, ProductSize } from '@/app/actions';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function getWishlistItems(): Promise<{ success: boolean; items?: Product[]; message: string }> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: true, items: [], message: 'User not logged in.' };
  }

  const { data: wishlistData, error: wishlistError } = await supabase
    .from('wishlist_items')
    .select('product_id')
    .eq('user_id', user.id);

  if (wishlistError) {
    console.error('Error fetching wishlist items:', wishlistError);
    return { success: false, message: 'Failed to fetch wishlist.' };
  }
  
  if (!wishlistData || wishlistData.length === 0) {
    return { success: true, items: [], message: 'Wishlist is empty.' };
  }
  
  const productIds = wishlistData.map(item => item.product_id);

  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select(`
        id, name, description, price, category, popularity, release_date, weight,
        product_images ( id, url, hint ),
        product_variants ( size, color, quantity )
    `)
    .in('id', productIds);
    
  if (productsError) {
    console.error('Error fetching product details for wishlist:', productsError);
    return { success: false, message: 'Failed to fetch product details.' };
  }

  const products: Product[] = productsData.map(p => {
    const sizesMap = new Map<string, { color: string; quantity: number }[]>();
    p.product_variants.forEach((variant: any) => {
        if (!sizesMap.has(variant.size)) sizesMap.set(variant.size, []);
        sizesMap.get(variant.size)!.push({ color: variant.color, quantity: variant.quantity });
    });
    const sizes: ProductSize[] = Array.from(sizesMap.entries()).map(([size, variants]) => ({ size, variants }));

    return {
        id: p.id.toString(),
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.category,
        popularity: p.popularity,
        releaseDate: p.release_date,
        weight: p.weight,
        images: p.product_images.map((img: any) => ({ id: img.id.toString(), url: img.url, hint: img.hint })),
        sizes: sizes,
    };
  });

  return { success: true, items: products, message: 'Wishlist fetched successfully.' };
}

export async function addWishlistItem(productId: string): Promise<{ success: boolean; message: string }> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'You must be logged in.' };
  }

  const { error } = await supabase
    .from('wishlist_items')
    .insert({
      user_id: user.id,
      product_id: productId,
    });
  
  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      return { success: true, message: 'Item is already in wishlist.' };
    }
    console.error('Error adding wishlist item:', error);
    return { success: false, message: 'Could not add item to wishlist.' };
  }

  revalidatePath('/wishlist');
  return { success: true, message: 'Item added to wishlist.' };
}

export async function removeWishlistItem(productId: string): Promise<{ success: boolean; message: string }> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'You must be logged in.' };
    }

    const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
    
    if (error) {
        console.error("Error removing wishlist item:", error);
        return { success: false, message: 'Could not remove item from wishlist.' };
    }

    revalidatePath('/wishlist');
    return { success: true, message: 'Item removed from wishlist.' };
}
