
'use server';

import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/app/actions';
import type { OrderDetails, OrderItem } from '@/app/track/actions';
import { cookies } from 'next/headers';

export type OrderSummary = Omit<OrderDetails, 'shipping_address' | 'tracking_data' | 'shiprocket_order_id' | 'payment_method'> & {
    shipment_id: number | null;
};


export async function getUserOrders(): Promise<{ success: boolean; orders?: OrderSummary[]; message: string }> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'User not authenticated.' };
    }

    // 1. Fetch all orders for the current user
    const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at, status, razorpay_order_id, shipment_id, order_items ( product_id, quantity, size, color, price_at_purchase )')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (ordersError) {
        console.error('Error fetching user orders:', ordersError);
        return { success: false, message: 'Could not fetch order history.' };
    }
    
    if (!ordersData || ordersData.length === 0) {
        return { success: true, orders: [], message: 'No orders found.' };
    }

    // 2. Collect all unique product IDs from all orders
    const productIds = [...new Set(
        ordersData.flatMap(order => order.order_items.map(item => item.product_id))
    )];

    // 3. Fetch details for all required products in a single query
    const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
            id, name, description, price, category, popularity, release_date, weight,
            product_images ( id, url, hint ),
            product_sizes ( size, quantity ),
            product_colors ( color )
        `)
        .in('id', productIds);

    if (productsError) {
        console.error('Error fetching product details for orders:', productsError);
        return { success: false, message: 'Failed to fetch product details for order history.' };
    }

    // Create a map for efficient product lookup
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
            weight: p.weight,
            images: p.product_images.map((img: any) => ({ id: img.id.toString(), url: img.url, hint: img.hint })),
            sizes: p.product_sizes.map((s: any) => ({size: s.size, quantity: s.quantity})),
            colors: p.product_colors.map((c: any) => c.color),
        }
    ]));

    // 4. Construct the final array of OrderSummary objects
    const orders: OrderSummary[] = ordersData.map(order => {
        const items: OrderItem[] = order.order_items.map(item => ({
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            price_at_purchase: item.price_at_purchase,
            product: productsMap.get(item.product_id.toString())!,
        })).filter(item => item.product); // Filter out items where product details might be missing

        return {
            id: order.id,
            created_at: order.created_at,
            status: order.status as OrderDetails['status'],
            razorpay_order_id: order.razorpay_order_id,
            shipment_id: order.shipment_id,
            items: items,
        };
    });

    return { success: true, orders, message: 'Orders fetched successfully.' };
}
