

'use server';

import { createClient } from '@/lib/supabase/server';
import type { OrderDetails } from '@/app/track/actions';
import type { Product } from '@/app/actions';
import { pushOrderToShiprocket } from '@/lib/shiprocket-client';
import { cookies } from 'next/headers';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export type UserProfileInfo = {
    display_name: string;
    email: string;
}

export type FullOrderDetails = OrderDetails & { user: UserProfileInfo; total_amount: number; };

export async function getAllOrders(): Promise<{ success: boolean; orders?: FullOrderDetails[]; message: string }> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    // 1. Fetch all orders with their items
    const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
            id, created_at, status, razorpay_order_id, shipping_address, user_id, shipment_id, shiprocket_order_id, payment_method, awb_code, total_amount,
            order_items ( product_id, quantity, size, color, price_at_purchase )
        `)
        .order('created_at', { ascending: false });

    if (ordersError) {
        console.error('Error fetching all orders:', ordersError);
        return { success: false, message: 'Could not fetch orders.' };
    }

    // 2. Collect all unique product and user IDs
    const productIds = [...new Set(ordersData.flatMap(order => order.order_items.map(item => item.product_id)))];
    const userIds = [...new Set(ordersData.map(order => order.user_id))];

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
    
    if (productsError) return { success: false, message: 'Could not fetch product details.' };

    // 4. Fetch user details
    const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, email')
        .in('id', userIds);
    
    if (usersError) return { success: false, message: 'Could not fetch user details.' };

    // 5. Create maps for efficient lookup
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
    const usersMap = new Map(usersData.map(u => [u.id, { display_name: u.display_name, email: u.email }]));

    // 6. Combine all data
    const fullOrders: FullOrderDetails[] = ordersData.map(order => {
        const user = usersMap.get(order.user_id) || { display_name: 'N/A', email: 'N/A' };
        const items = order.order_items.map(item => ({
            ...item,
            product: productsMap.get(item.product_id.toString())!,
        })).filter(item => item.product);

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
            items: items,
            total_amount: order.total_amount,
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
    