
'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { CartItem } from '@/contexts/cart-context';
import type { Product } from '@/app/actions';

// This admin client is used for fetching product details, as cart items only store product IDs.
// We need a server-side client with elevated privileges to join tables.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// This function creates a Supabase client for the current user, using their auth cookie.
// It's the standard way to interact with Supabase on behalf of a logged-in user in Server Actions.
function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

export async function getCartItems(): Promise<{ success: boolean; items?: CartItem[]; message: string }> {
  const supabase = createSupabaseServerClient();
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
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'You must be logged in.' };
  }

  // Use an "upsert" operation to either insert a new item or update the quantity of an existing one.
  // The `onConflict` part tells Supabase what to do if an item with the same user_id, product_id, size, and color already exists.
   const { data, error } = await supabase
    .from('cart_items')
    .upsert({
      user_id: user.id,
      product_id: payload.product.id,
      size: payload.size,
      color: payload.color,
      quantity: payload.quantity,
    }, { onConflict: 'user_id,product_id,size,color' })
    .select()
    .single();

  if (error) {
      console.error('Error in upsert_cart_item:', error);
      return { success: false, message: 'Could not add item to cart.' };
  }
 
  // We need to fetch the full product again to return the full CartItem
  // This is a simplified approach. For better performance, we could pass the full product back from the RPC.
  const { items } = await getCartItems();
  const addedItem = items?.find(i => i.product.id === payload.product.id && i.size === payload.size && i.color === payload.color);

  if (!addedItem) {
      // This could happen if getCartItems fails, but the upsert succeeded.
      // We can construct a partial item to send back to the client reducer.
      const partialItem = {
          product: payload.product,
          quantity: data.quantity,
          size: data.size,
          color: data.color
      };
      return { success: true, item: partialItem, message: 'Item added/updated in cart.' };
  }

  return { success: true, item: addedItem, message: 'Item added/updated in cart.' };
}


type UpdateQuantityPayload = {
    productId: string;
    size: string;
    color: string;
    quantity: number;
}
export async function updateCartItemQuantity(payload: UpdateQuantityPayload): Promise<{ success: boolean; item?: CartItem; message: string }> {
     const supabase = createSupabaseServerClient();
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

     if (!updatedItem) {
        return { success: false, message: 'Could not retrieve the updated item.' };
     }

     return { success: true, item: updatedItem, message: 'Quantity updated.' };
}


type RemoveItemPayload = {
    productId: string;
    size: string;
    color: string;
}

export async function removeCartItem(payload: RemoveItemPayload): Promise<{ success: boolean; message: string }> {
    const supabase = createSupabaseServerClient();
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

    