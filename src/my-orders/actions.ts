
'use server';

import { createClient } from '@/lib/supabase/server';
import type { Product, ProductSize } from '@/app/actions';
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
        .select('id, created_at, status, razorpay_order_id, shipment_id, total_amount, order_items!inner(product_id, quantity, size, color, price_at_purchase)')
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
            product_variants ( size, color, quantity )
        `)
        .in('id', productIds);

    if (productsError) {
        console.error('Error fetching product details for orders:', productsError);
        return { success: false, message: 'Failed to fetch product details for order history.' };
    }

    // Create a map for efficient product lookup
     const productsMap = new Map<string, Product>(productsData.map(p => {
        const sizesMap = new Map<string, { color: string; quantity: number }[]>();
        p.product_variants.forEach((variant: any) => {
            if (!sizesMap.has(variant.size)) sizesMap.set(variant.size, []);
            sizesMap.get(variant.size)!.push({ color: variant.color, quantity: variant.quantity });
        });
        const sizes: ProductSize[] = Array.from(sizesMap.entries()).map(([size, variants]) => ({ size, variants }));

        return [
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
                sizes: sizes,
            }
        ];
    }));

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
                items: items,
                tracking_data: tracking_data, // Add tracking data here
            };
        })
    );

    return { success: true, orders, message: 'Orders fetched successfully.' };
}

