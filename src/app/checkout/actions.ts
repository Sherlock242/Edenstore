// src/app/checkout/actions.ts
'use server';

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getCartItems } from '../cart/actions';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false }, db: { schema: 'public'} }
);

type CreateOrderPayload = {
    amount: number;
}
export async function createRazorpayOrder(payload: CreateOrderPayload): Promise<{success: boolean; order?: any; message: string}> {
    try {
        const instance = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });

        const options = {
            amount: Math.round(payload.amount * 100), // amount in smallest currency unit
            currency: "INR",
            receipt: `receipt_order_${new Date().getTime()}`,
        };

        const order = await instance.orders.create(options);
        
        if (!order) {
            return { success: false, message: "Could not create order." };
        }
        
        return { success: true, order, message: "Order created." };

    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message: `An error occurred while creating the order: ${errorMessage}` };
    }
}


type VerifyPaymentPayload = {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    totalAmount: number;
    shippingAddress: any;
}
export async function verifyPaymentAndCreateOrder(payload: VerifyPaymentPayload): Promise<{success: boolean; message: string; orderId?: string}> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, totalAmount, shippingAddress } = payload;
    const key_secret = process.env.RAZORPAY_KEY_SECRET!;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac("sha256", key_secret)
        .update(body.toString())
        .digest("hex");
    
    // 1. Verify Payment Signature
    if (expectedSignature !== razorpay_signature) {
        return { success: false, message: "Payment verification failed. Signature mismatch." };
    }

    // 2. Payment is verified, now create the order in the database.
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "User not authenticated. Cannot create order." };
    }

    // 3. Get cart items to be saved as order items.
    const cart = await getCartItems();
    if (!cart.success || !cart.items || cart.items.length === 0) {
        return { success: false, message: "Cart is empty or could not be fetched. Cannot create order." };
    }
    
    // 4. Insert into 'orders' table
    const { data: newOrder, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
            user_id: user.id,
            total_price: totalAmount,
            status: 'processing',
            shipping_address: JSON.stringify(shippingAddress),
            razorpay_order_id: razorpay_order_id,
            razorpay_payment_id: razorpay_payment_id,
        })
        .select()
        .single();
    
    if (orderError || !newOrder) {
        console.error("Error creating order:", orderError);
        return { success: false, message: `Failed to save order to the database. Reason: ${orderError?.message || 'Unknown error'}` };
    }

    // 5. Insert into 'order_items' table
    const orderItemsToInsert = cart.items.map(item => ({
        order_id: newOrder.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_purchase: item.product.price,
        size: item.size,
        color: item.color,
    }));

    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItemsToInsert);

    if (itemsError) {
        console.error("Error creating order items:", itemsError);
        // If this fails, we should ideally roll back the order creation,
        // but for now, we'll just log the error.
        return { success: false, message: `Failed to save order items. Reason: ${itemsError.message}` };
    }

    // 6. Clear the user's cart
    const { error: deleteCartError } = await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

    if (deleteCartError) {
        console.error("Error clearing cart:", deleteCartError);
        // Don't fail the whole process if cart clearing fails, just log it.
    }
    
    return { success: true, message: "Payment verified and order created successfully.", orderId: newOrder.id };
}
