
// src/app/track/actions.ts
'use server';

import type { Product, ProductSize } from '@/app/actions';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { createClient as createAdminClient } from '@supabase/supabase-js';

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
            id, created_at, status, shipping_address, razorpay_order_id, shipment_id, shiprocket_order_id, payment_method, awb_code,
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

    // 3. Fetch product details using the admin client
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
    const { data: productsData, error: productsError } = await supabaseAdmin
        .from('products')
        .select(`
            id, name, description, price, category, popularity, release_date, weight,
            product_images ( id, url, hint ),
            product_variants ( size, color, quantity )
        `)
        .in('id', productIds);
    
    if (productsError) {
        return { success: false, message: 'Could not fetch product details for the order.' };
    }

    // 4. Create a map for easy product lookup
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
        awb_code: orderData.awb_code,
        payment_method: orderData.payment_method as OrderDetails['payment_method'],
        items: itemsWithProducts,
    };

    return { success: true, order: finalOrder, message: 'Order details fetched successfully.' };
}

    

    