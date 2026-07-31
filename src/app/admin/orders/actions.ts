'use server';

import type { OrderDetails } from '@/app/track/actions';
import type { Product, ProductSize } from '@/app/actions';
import { pushOrderToShiprocket } from '@/lib/shiprocket-client';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export type UserProfileInfo = {
    display_name: string;
    email: string;
}

export type FullOrderDetails = OrderDetails & { 
    user: UserProfileInfo; 
    total_amount: number; 
    discount_amount?: number;
    coupon_code?: string;
};

export async function getAllOrders(): Promise<{ success: boolean; orders?: FullOrderDetails[]; message: string }> {
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
    
    // 1. Fetch all orders
    const { data: ordersData, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (ordersError) {
        console.error('Error fetching all orders:', ordersError);
        return { success: false, message: `Could not fetch orders. DB Error: ${ordersError.message}` };
    }

    if (!ordersData || ordersData.length === 0) {
        return { success: true, orders: [], message: 'No orders found in the database.' };
    }

    // 2. Fetch all order items
    const orderIds = ordersData.map(o => o.id);
    const { data: orderItemsData, error: orderItemsError } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);
    
    if (orderItemsError) {
        console.error('Error fetching order items:', orderItemsError);
        return { success: false, message: `Could not fetch order items. DB Error: ${orderItemsError.message}` };
    }

    if (!orderItemsData || orderItemsData.length === 0) {
        return { success: true, orders: [], message: 'No order items found for the existing orders.' };
    }

    // 3. Create a map of orderId -> items
    const orderItemsMap = new Map<string, any[]>();
    orderItemsData.forEach(item => {
        if (!orderItemsMap.has(item.order_id)) {
            orderItemsMap.set(item.order_id, []);
        }
        orderItemsMap.get(item.order_id)!.push(item);
    });

    // 4. Filter out orders that surprisingly have no items after the fact
    const ordersWithItems = ordersData.filter(order => orderItemsMap.has(order.id));
     if (ordersWithItems.length === 0) {
        return { success: true, orders: [], message: 'No orders with items found after processing.' };
    }

    // 5. Collect all unique product and user IDs
    const productIds = [...new Set(orderItemsData.map(item => item.product_id))];
    const userIds = [...new Set(ordersWithItems.map(order => order.user_id))];

    // 6. Fetch all required product details
    const { data: productsData, error: productsError } = await supabaseAdmin
        .from('products')
        .select(`
            id, name, description, price, category, popularity, release_date, weight,
            product_images ( id, url, hint ),
            product_variants ( size, color, quantity )
        `)
        .in('id', productIds);
    
    if (productsError) {
        console.error('Error fetching product details for orders:', productsError);
        return { success: false, message: `Could not fetch product details. DB Error: ${productsError.message}` };
    }

    // 7. Fetch all required user details
    const { data: usersData, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, display_name, email')
        .in('id', userIds);
    
    if (usersError) {
        console.error('Error fetching user details for orders:', usersError);
        return { success: false, message: `Could not fetch user details. DB Error: ${usersError.message}` };
    }

    // 8. Create maps for efficient lookup
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
    const usersMap = new Map(usersData.map(u => [u.id, { display_name: u.display_name, email: u.email }]));

    // 9. Combine all data into the final structure
    const fullOrders: FullOrderDetails[] = ordersWithItems.map(order => {
        const user = usersMap.get(order.user_id) || { display_name: 'N/A', email: 'N/A' };
        const itemsForThisOrder = (orderItemsMap.get(order.id) || []).map(item => ({
            ...item,
            product: productsMap.get(item.product_id.toString())!,
        })).filter(item => item.product); // Filter out items if product not found

        return {
            id: order.id,
            created_at: order.created_at,
            status: order.status as OrderDetails['status'],
            shipping_address: order.shipping_address,
            razorpay_order_id: order.razorpay_order_id,
            shipment_id: order.shipment_id,
            shiprocket_order_id: order.shiprocket_order_id,
            payment_method: order.payment_method,
            awb_code: order.awb_code,
            user: user,
            items: itemsForThisOrder,
            total_amount: order.total_amount,
            discount_amount: order.discount_amount,
            coupon_code: order.coupon_code,
        };
    });

    return { success: true, orders: fullOrders, message: 'Orders fetched successfully.' };
}


export async function updateOrderStatus(orderId: string, status: OrderDetails['status']): Promise<{ success: boolean; message: string }> {
    // Use the admin client to bypass RLS for status updates.
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
    const { error } = await supabaseAdmin
        .from('orders')
        .update({ status: status })
        .eq('id', orderId);

    if (error) {
        console.error('Error updating order status:', error);
        return { success: false, message: 'Failed to update order status.' };
    }

    return { success: true, message: 'Order status updated successfully.' };
}


export async function sendOrderToShiprocket(order: FullOrderDetails): Promise<{ success: boolean; message: string, shipmentId?: number, shiprocketOrderId?: number }> {
     // Use the admin client to bypass RLS when updating the order.
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
    
    const pushResult = await pushOrderToShiprocket(order);
    if (!pushResult.success || !pushResult.payload) {
        return { success: false, message: pushResult.message };
    }

    const { shipment_id, order_id } = pushResult.payload;

    // Save shipment details and update status to 'processing' using the admin client
    const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          shipment_id: shipment_id,
          shiprocket_order_id: order_id,
          status: 'processing' // Set status to processing after pushing
        })
        .eq('id', order.id);
      
    if(updateError) {
        console.error("Failed to save shipment details to order:", updateError.message);
        return { success: false, message: `Order pushed to Shiprocket, but failed to save details in local DB. Error: ${updateError.message}` };
    }

    return { 
        success: true, 
        message: `Order successfully pushed to Shiprocket. Shipment ID: ${shipment_id}`, 
        shipmentId: shipment_id, 
        shiprocketOrderId: order_id 
    };
}

export async function deleteOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
    
    // 1. Delete order items first (to be explicit, though cascade should handle it)
    await supabaseAdmin.from('order_items').delete().eq('order_id', orderId);

    // 2. Delete the order record
    const { error } = await supabaseAdmin
        .from('orders')
        .delete()
        .eq('id', orderId);

    if (error) {
        console.error('Error deleting order:', error);
        return { success: false, message: 'Failed to delete order from database.' };
    }

    return { success: true, message: 'Order deleted successfully.' };
}
