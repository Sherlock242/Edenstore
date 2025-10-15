
// src/app/track/actions.ts
'use server';

import type { Product } from '@/app/actions';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Define a more specific OrderItem type for this context if needed
export type OrderItemDetails = {
    product_id: string;
    quantity: number;
    size: string;
    color: string;
    price_at_purchase: number;
    product: Product; // This will be populated
};

export type OrderDetails = {
    id: string;
    created_at: string;
    status: 'pending-shipment' | 'processing' | 'shipped' | 'delivered';
    shipping_address: string | object;
    razorpay_order_id: string;
    shipment_id: number | null;
    shiprocket_order_id: number | null;
    awb_code?: string | null;
    payment_method: 'COD' | 'Prepaid' | null;
    items: OrderItemDetails[];
};

export async function getOrderDetailsByRazorpayId(razorpayOrderId: string): Promise<{ success: boolean; order?: OrderDetails; message: string }> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. Fetch the order by Razorpay Order ID
    const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
            id, created_at, status, shipping_address, razorpay_order_id, shipment_id, shiprocket_order_id, payment_method,
            order_items ( product_id, quantity, size, color, price_at_purchase )
        `)
        .eq('razorpay_order_id', razorpayOrderId)
        .single();

    if (orderError || !orderData) {
        console.error('Error fetching order by Razorpay ID:', orderError);
        return { success: false, message: 'Order not found.' };
    }

    // 2. Collect product IDs from the order items
    const productIds = orderData.order_items.map(item => item.product_id);

    // 3. Fetch product details
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
        return { success: false, message: 'Could not fetch product details for the order.' };
    }

    // 4. Create a map for easy product lookup
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
        sizes: p.product_sizes.map((s: any) => ({ size: s.size, quantity: s.quantity })),
        colors: p.product_colors.map((c: any) => c.color),
      }
    ]));

    // 5. Combine order and product data
    const itemsWithProducts: OrderItemDetails[] = orderData.order_items.map(item => ({
        ...item,
        product: productsMap.get(item.product_id.toString())!,
    })).filter(item => item.product); // Filter out any items where product might be missing

    const finalOrder: OrderDetails = {
        id: orderData.id,
        created_at: orderData.created_at,
        status: orderData.status as OrderDetails['status'],
        shipping_address: orderData.shipping_address,
        razorpay_order_id: orderData.razorpay_order_id,
        shipment_id: orderData.shipment_id,
        shiprocket_order_id: orderData.shiprocket_order_id,
        payment_method: orderData.payment_method as OrderDetails['payment_method'],
        items: itemsWithProducts,
    };

    return { success: true, order: finalOrder, message: 'Order details fetched successfully.' };
}

    