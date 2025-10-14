// src/app/checkout/actions.ts
'use server';

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { getCartItems } from '../cart/actions';
import { getShippingRates } from '@/lib/shiprocket-client';
import { randomBytes } from 'crypto';


export async function fetchShippingRatesAction(pincode: string, paymentMethod: 'online' | 'cod'): Promise<{success: boolean, message: string, rate?: number}> {
    if (!pincode || pincode.length !== 6) {
        return { success: false, message: 'Invalid Pincode.' };
    }

    const pickupPostcode = process.env.SHIPROCKET_PICKUP_POSTCODE || "160015"; 
    
    if (!pickupPostcode) {
        console.error("SHIPROCKET_PICKUP_POSTCODE is not set in .env and no default is provided.");
        return { success: false, message: 'Server configuration error.' };
    }

    const cart = await getCartItems();
    if (!cart.success || !cart.items || cart.items.length === 0) {
        return { success: false, message: "Cart is empty." };
    }

    const totalWeight = cart.items.reduce((acc, item) => acc + (item.product.weight * item.quantity), 0);
    const subTotal = cart.items.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

    const result = await getShippingRates({
        pickup_postcode: pickupPostcode,
        delivery_postcode: pincode,
        weight: totalWeight > 0 ? totalWeight : 0.1, // Ensure weight is not zero
        cod: paymentMethod === 'cod' ? 1 : 0
    });

    return result;
}


type CreateOrderPayload = {
    amount: number;
}
export async function createRazorpayOrder(payload: CreateOrderPayload): Promise<{success: boolean; order?: any; message: string}> {
    try {
        const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return { success: false, message: "Razorpay keys are not configured correctly." };
        }

        const instance = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
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
    shippingAddress: any;
}
export async function verifyPaymentAndCreateOrder(payload: VerifyPaymentPayload): Promise<{success: boolean; message: string; razorpayOrderId?: string}> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, shippingAddress } = payload;
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
    if (!cart.success || !cart.items || !cart.items.length) {
        return { success: false, message: "Cart is empty or could not be fetched. Cannot create order." };
    }
    
    // 4. Insert into 'orders' table
    const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: user.id,
            status: 'processing',
            shipping_address: JSON.stringify(shippingAddress),
            razorpay_order_id: razorpay_order_id,
            razorpay_payment_id: razorpay_payment_id,
            payment_method: 'Prepaid',
        })
        .select('id, created_at')
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

    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);

    if (itemsError) {
        console.error("Error creating order items:", itemsError);
        return { success: false, message: `Failed to save order items. Reason: ${itemsError.message}` };
    }

    // 6. Clear the user's cart
    const { error: deleteCartError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

    if (deleteCartError) {
        console.error("Error clearing cart:", deleteCartError);
    }
    
    return { success: true, message: "Payment verified and order created successfully.", razorpayOrderId: razorpay_order_id };
}


type CreateCodOrderPayload = {
    shippingAddress: any;
}
export async function createCodOrder(payload: CreateCodOrderPayload): Promise<{success: boolean; message: string; razorpayOrderId?: string}> {
    const { shippingAddress } = payload;
    const supabase = createClient();
    
    // 1. Get user and cart details
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "User not authenticated. Cannot create order." };
    }

    const cart = await getCartItems();
    if (!cart.success || !cart.items || cart.items.length === 0) {
        return { success: false, message: "Cart is empty or could not be fetched." };
    }
    
    // Generate a unique, human-readable order ID for COD orders
    const codOrderId = `cod_${randomBytes(6).toString('hex')}`;

    // 2. Insert into 'orders' table
    const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: user.id,
            status: 'processing',
            shipping_address: JSON.stringify(shippingAddress),
            razorpay_order_id: codOrderId, // Use our generated ID
            payment_method: 'COD',
        })
        .select('id, created_at')
        .single();
    
    if (orderError || !newOrder) {
        console.error("Error creating COD order:", orderError);
        return { success: false, message: `Failed to save order. Reason: ${orderError?.message || 'Unknown'}` };
    }

    // 3. Insert into 'order_items' table
    const orderItemsToInsert = cart.items.map(item => ({
        order_id: newOrder.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_purchase: item.product.price,
        size: item.size,
        color: item.color,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);

    if (itemsError) {
        console.error("Error creating COD order items:", itemsError);
        // Ideally, rollback the order here. For now, log and return error.
        return { success: false, message: `Failed to save order items. Reason: ${itemsError.message}` };
    }

    // 4. Clear the user's cart
    await supabase.from('cart_items').delete().eq('user_id', user.id);

    return { success: true, message: "COD Order created successfully.", razorpayOrderId: codOrderId };
}
