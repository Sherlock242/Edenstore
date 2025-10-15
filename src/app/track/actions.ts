
// src/app/track/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/app/actions';
import { trackShipmentById } from '@/lib/shiprocket-client';
import { cookies } from 'next/headers';

export type OrderItem = {
    quantity: number;
    size: string;
    color: string;
    price_at_purchase: number;
    product: Product;
};

export type OrderDetails = {
    id: string;
    created_at: string;
    status: 'pending-shipment' | 'processing' | 'shipped' | 'delivered';
    shipping_address: any;
    razorpay_order_id: string;
    shipment_id: number | null;
    shiprocket_order_id: number | null;
    payment_method: 'Prepaid' | 'COD' | null;
    items: OrderItem[];
    tracking_data?: any; // To hold live tracking info from Shiprocket
};

export async function getOrderDetailsByShipmentId(shipmentId: string): Promise<{ success: boolean; order?: OrderDetails; message: string }> {
    if (!shipmentId || isNaN(Number(shipmentId))) {
        return { success: false, message: 'A valid Shipment ID is required.' };
    }
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 1. Fetch the main order details using the Shipment ID
    const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, created_at, status, shipping_address, razorpay_order_id, shipment_id, shiprocket_order_id, payment_method')
        .eq('shipment_id', Number(shipmentId))
        .single();

    if (orderError || !orderData) {
        console.error('Error fetching order by shipment ID:', orderError);
        return { success: false, message: 'Order not found for this shipment ID.' };
    }

    // 2. Fetch the associated order items
    const { data: orderItemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, size, color, price_at_purchase')
        .eq('order_id', orderData.id);

    if (itemsError || !orderItemsData) {
        return { success: false, message: 'Could not fetch items for this order.' };
    }
    
    const productIds = [...new Set(orderItemsData.map(item => item.product_id))];

    // 4. Fetch details for all products in the order
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
        return { success: false, message: 'Failed to fetch product details for the order.' };
    }

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

    const fullOrderItems: OrderItem[] = orderItemsData.map(item => ({
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price_at_purchase: item.price_at_purchase,
        product: productsMap.get(item.product_id.toString())!,
    })).filter(item => item.product);

    // 6. Fetch live tracking data from Shiprocket
    const trackingData = await trackShipmentById(shipmentId);

    const orderDetails: OrderDetails = {
        id: orderData.id,
        created_at: orderData.created_at,
        status: orderData.status as OrderDetails['status'],
        shipping_address: orderData.shipping_address,
        razorpay_order_id: orderData.razorpay_order_id,
        shipment_id: orderData.shipment_id,
        shiprocket_order_id: orderData.shiprocket_order_id,
        payment_method: orderData.payment_method as 'Prepaid' | 'COD' | null,
        items: fullOrderItems,
        tracking_data: trackingData,
    };

    return { success: true, order: orderDetails, message: 'Order details fetched successfully.' };
}
