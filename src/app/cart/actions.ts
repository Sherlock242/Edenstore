
'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { CartItem } from '@/contexts/cart-context';
import type { Product } from '@/app/actions';

type ServerResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
};

// This admin client is used for fetching product details, as cart items only store product IDs.
// We need a server-side client with elevated privileges to join tables.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// This function creates a Supabase client for the current user, using their auth cookie.
// It's the standard way to interact with Supabase on behalf of a logged-in user in Server Actions.
async function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

export async function getCartItems(): Promise<{ success: boolean; items?: CartItem[]; message: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: true, items: [], message: 'User not logged in.' };
  }

  // 1. Fetch basic cart items (product_id, quantity, etc.) for the current user.
  const { data: cartItemsData, error: cartError } = await supabase
    .from('cart_items')
    .select('product_id, quantity, size, color')
    .eq('user_id', user.id);

  if (cartError) {
    console.error('Error fetching cart items:', cartError);
    return { success: false, message: 'Failed to fetch cart.' };
  }

  if (!cartItemsData || cartItemsData.length === 0) {
    return { success: true, items: [], message: 'Cart is empty.' };
  }
  
  // 2. Extract all unique product IDs from the cart.
  const productIds = [...new Set(cartItemsData.map(item => item.product_id))];

  // 3. Fetch all product details for the items in the cart using the admin client.
  const { data: productsData, error: productsError } = await supabaseAdmin
    .from('products')
    .select(`
        id, name, description, price, category, popularity, release_date,
        product_images ( id, url, hint ),
        product_sizes ( size ),
        product_colors ( color )
    `)
    .in('id', productIds);
    
  if (productsError) {
    console.error('Error fetching product details for cart:', productsError);
    return { success: false, message: 'Failed to fetch product details.' };
  }

  // Create a map for quick product lookup.
  const productsMap = new Map<string, Product>(productsData.map(p => [
      p.id.toString(), 
      {
        id: p.id.toString(),
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.category,
        popularity: p.popularity,
        releaseDate: p.release_date,
        images: p.product_images.map((img: any) => ({ id: img.id.toString(), url: img.url, hint: img.hint })),
        sizes: p.product_sizes.map((s: any) => s.size),
        colors: p.product_colors.map((c: any) => c.color),
      }
  ]));

  // 4. Combine product details with cart item data.
  const fullCartItems: CartItem[] = cartItemsData.map(cartItem => {
    const product = productsMap.get(cartItem.product_id.toString());
    return {
      product: product!,
      quantity: cartItem.quantity,
      size: cartItem.size,
      color: cartItem.color,
    };
  }).filter(item => item.product); // Filter out any items where product details might have failed to load.

  return { success: true, items: fullCartItems, message: 'Cart fetched successfully.' };
}


type AddItemPayload = {
  product: Product;
  quantity: number;
  size: string;
  color: string;
};

export async function addCartItem(payload: AddItemPayload): Promise<{ success: boolean; item?: CartItem; message: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'You must be logged in.' };
  }

  // Upsert allows us to either insert a new item or update the quantity if it already exists.
  // The ON CONFLICT clause targets the unique index we created on (user_id, product_id, size, color).
  const { data, error } = await supabase
    .from('cart_items')
    .upsert({
      user_id: user.id,
      product_id: payload.product.id,
      size: payload.size,
      color: payload.color,
      quantity: payload.quantity,
    }, {
      onConflict: 'user_id, product_id, size, color',
      // If there's a conflict, we update the quantity. We add the new quantity to the existing one.
      // Note: This SQL is specific to Supabase/PostgreSQL.
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
     // A "23505" error code indicates a unique constraint violation, which is what our upsert handles.
     // If we get a different error, we log it.
    if (error.code !== '23505') {
        console.error('Error adding to cart:', error);
        return { success: false, message: 'Could not add item to cart.' };
    }
    // If it is a unique constraint violation, we'll manually update the quantity.
    // This is a fallback for the `upsert` with `onConflict` not behaving as expected in all environments.
     const { data: existing, error: findError } = await supabase.from('cart_items').select('id, quantity').eq('user_id', user.id).eq('product_id', payload.product.id).eq('size', payload.size).eq('color', payload.color).single();
     if(findError || !existing) {
         return { success: false, message: 'Could not add item to cart.' };
     }
     const { data: updatedData, error: updateError } = await supabase.from('cart_items').update({ quantity: existing.quantity + payload.quantity }).eq('id', existing.id).select().single();
     if (updateError) {
         return { success: false, message: 'Could not update item quantity.' };
     }
     return { success: true, item: { ...payload, quantity: updatedData.quantity }, message: 'Item quantity updated.' };
  }

  return { success: true, item: { ...payload, quantity: data.quantity }, message: 'Item added to cart.' };
}


type UpdateQuantityPayload = {
    productId: string;
    size: string;
    color: string;
    quantity: number;
}
export async function updateCartItemQuantity(payload: UpdateQuantityPayload): Promise<{ success: boolean; item?: CartItem; message: string }> {
     const supabase = await createSupabaseServerClient();
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return { success: false, message: 'You must be logged in.' };

     const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity: payload.quantity })
        .eq('user_id', user.id)
        .eq('product_id', payload.productId)
        .eq('size', payload.size)
        .eq('color', payload.color)
        .select()
        .single();
    
     if (error) {
         console.error("Error updating quantity:", error);
         return { success: false, message: 'Could not update quantity.' }
     }
    
     // We need to fetch the full product again to return the full CartItem
     const { items } = await getCartItems();
     const updatedItem = items?.find(i => i.product.id === payload.productId && i.size === payload.size && i.color === payload.color);

     return { success: true, item: updatedItem, message: 'Quantity updated.' };
}


type RemoveItemPayload = {
    productId: string;
    size: string;
    color: string;
}

export async function removeCartItem(payload: RemoveItemPayload): Promise<{ success: boolean; message: string }> {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'You must be logged in.' };
    
    const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', payload.productId)
        .eq('size', payload.size)
        .eq('color', payload.color);

    if (error) {
        console.error("Error removing item:", error);
        return { success: false, message: 'Could not remove item from cart.' };
    }

    return { success: true, message: 'Item removed.' };
}
