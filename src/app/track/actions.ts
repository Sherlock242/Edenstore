// src/app/track/actions.ts
'use server';

import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { Product } from '@/app/actions';

// Admin client to securely fetch all order data
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type OrderItem = {
    quantity: number;
    size: string;
    color: string;
    product: Product;
};

export type OrderDetails = {
    id: string;
    created_at: string;
    status: 'processing' | 'shipped' | 'delivered';
    shipping_address: any;
    items: OrderItem[];
};

export async function getOrderDetails(orderId: string): Promise<{ success: boolean; order?: OrderDetails; message: string }> {
    if (!orderId) {
        return { success: false, message: 'Order ID is required.' };
    }

    // 1. Fetch the main order details
    const { data: orderData, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('id, created_at, status, shipping_address')
        .eq('id', orderId)
        .single();

    if (orderError || !orderData) {
        console.error('Error fetching order:', orderError);
        return { success: false, message: 'Order not found.' };
    }

    // 2. Fetch the associated order items
    const { data: orderItemsData, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('product_id, quantity, size, color')
        .eq('order_id', orderId);

    if (itemsError || !orderItemsData) {
        console.error('Error fetching order items:', itemsError);
        return { success: false, message: 'Could not fetch items for this order.' };
    }
    
    // 3. Get all unique product IDs from the order items
    const productIds = [...new Set(orderItemsData.map(item => item.product_id))];

    // 4. Fetch details for all products in the order
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
        console.error('Error fetching product details for order:', productsError);
        return { success: false, message: 'Failed to fetch product details for the order.' };
    }

    // Create a map for easy product lookup
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

    // 5. Combine all data into the final OrderDetails object
    const fullOrderItems: OrderItem[] = orderItemsData.map(item => ({
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        product: productsMap.get(item.product_id.toString())!,
    })).filter(item => item.product);

    if (fullOrderItems.length === 0) {
        return { success: false, message: "Could not find product details for items in this order." };
    }

    const orderDetails: OrderDetails = {
        id: orderData.id,
        created_at: orderData.created_at,
        status: orderData.status as OrderDetails['status'],
        shipping_address: orderData.shipping_address,
        items: fullOrderItems
    };

    return { success: true, order: orderDetails, message: 'Order details fetched successfully.' };
}
