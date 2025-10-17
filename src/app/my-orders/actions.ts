
'use server';

import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/app/actions';
import { cookies } from 'next/headers';
import { trackShipmentById } from '@/lib/shiprocket-client';


export type OrderItem = {
    quantity: number;
    size: string;
    color: string;
    price_at_purchase: number;
    product: Product;
};

export type OrderSummary = {
    id: string;
    created_at: string;
    status: 'pending-shipment' | 'processing' | 'shipped' | 'delivered' | 'processing-error';
    razorpay_order_id: string;
    shipment_id: number | null;
    total_amount: number;
    discount_amount?: number;
    coupon_code?: string;
    items: OrderItem[];
    tracking_data?: any; // To hold live tracking info from Shiprocket
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
        .select('id, created_at, status, razorpay_order_id, shipment_id, total_amount, discount_amount, coupon_code, order_items!inner(product_id, quantity, size, color, price_at_purchase)')
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

    // 4. Construct the final array of OrderSummary objects, now including tracking data
    const orders: OrderSummary[] = await Promise.all(
        ordersData.map(async (order) => {
            const items: OrderItem[] = order.order_items.map(item => ({
                quantity: item.quantity,
                size: item.size,
                color: item.color,
                price_at_purchase: item.price_at_purchase,
                product: productsMap.get(item.product_id.toString())!,
            })).filter(item => item.product);

            // Fetch tracking data if shipment_id exists
            let tracking_data = null;
            if (order.shipment_id) {
                tracking_data = await trackShipmentById(order.shipment_id.toString());
            }

            return {
                id: order.id,
                created_at: order.created_at,
                status: order.status as OrderSummary['status'],
                razorpay_order_id: order.razorpay_order_id,
                shipment_id: order.shipment_id,
                total_amount: order.total_amount,
                discount_amount: order.discount_amount,
                coupon_code: order.coupon_code,
                items: items,
                tracking_data: tracking_data, // Add tracking data here
            };
        })
    );

    return { success: true, orders, message: 'Orders fetched successfully.' };
}
