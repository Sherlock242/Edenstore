
// src/app/checkout/actions.ts
'use server';

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { getCartItems } from '../cart/actions';
import { getShippingRates } from '@/lib/shiprocket-client';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { sendOrderToShiprocket } from '@/app/admin/orders/actions';
import type { FullOrderDetails, UserProfileInfo } from '@/app/admin/orders/actions';


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
    
    // In India, GST is typically applied on the shipping fee as well.
    // However, Shiprocket's rate API returns the final rate inclusive of their taxes.
    // The subTotal for `declared_value` should be the pre-tax value of goods.
    const result = await getShippingRates({
        pickup_postcode: pickupPostcode,
        delivery_postcode: pincode,
        weight: totalWeight > 0 ? totalWeight : 0.1, // Ensure weight is not zero
        cod: paymentMethod === 'cod' ? 1 : 0,
        declared_value: subTotal,
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
export async function verifyPaymentAndCreateOrder(payload: VerifyPaymentPayload): Promise<{success: boolean; message: string; shipmentId?: number}> {
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

    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "User not authenticated. Cannot create order." };
    }
    
    const { data: userProfile } = await supabase.from('users').select('display_name, email').eq('id', user.id).single();

    const cart = await getCartItems();
    if (!cart.success || !cart.items || !cart.items.length) {
        return { success: false, message: "Cart is empty or could not be fetched. Cannot create order." };
    }
    
    // Start transaction
    const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: user.id,
            status: 'pending-shipment',
            shipping_address: JSON.stringify(shippingAddress),
            razorpay_order_id: razorpay_order_id,
            razorpay_payment_id: razorpay_payment_id,
            payment_method: 'Prepaid',
        })
        .select()
        .single();
    
    if (orderError || !newOrder) {
        console.error("Error creating order:", orderError);
        return { success: false, message: `Failed to save order to the database. Reason: ${orderError?.message || 'Unknown error'}` };
    }

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
        await supabase.from('orders').delete().eq('id', newOrder.id); // Rollback order
        return { success: false, message: `Failed to save order items. Reason: ${itemsError.message}` };
    }
    
    // Construct the FullOrderDetails object to send to Shiprocket
    const fullOrder: FullOrderDetails = {
        id: newOrder.id,
        created_at: newOrder.created_at,
        status: 'pending-shipment',
        shipping_address: newOrder.shipping_address,
        razorpay_order_id: newOrder.razorpay_order_id,
        shipment_id: null,
        shiprocket_order_id: null,
        payment_method: 'Prepaid',
        items: cart.items.map(ci => ({...ci, product_id: ci.product.id, price_at_purchase: ci.product.price})),
        user: { display_name: userProfile?.display_name || '', email: userProfile?.email || '' }
    };

    // Automatically push to Shiprocket
    const pushResult = await sendOrderToShiprocket(fullOrder);

    if (!pushResult.success) {
        // Even if push fails, the order is created. Log error and inform user.
        console.error(`Failed to auto-push order ${newOrder.id} to Shiprocket: ${pushResult.message}`);
        // Don't fail the whole transaction, but maybe flag it for manual review.
    }
    
    // Clear cart after successful order creation
    await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);
    
    return { success: true, message: "Payment verified and order created successfully.", shipmentId: pushResult.shipmentId };
}


type CreateCodOrderPayload = {
    shippingAddress: any;
}
export async function createCodOrder(payload: CreateCodOrderPayload): Promise<{success: boolean; message: string; shipmentId?: number}> {
    const { shippingAddress } = payload;
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "User not authenticated. Cannot create order." };
    }
    const { data: userProfile } = await supabase.from('users').select('display_name, email').eq('id', user.id).single();


    const cart = await getCartItems();
    if (!cart.success || !cart.items || cart.items.length === 0) {
        return { success: false, message: "Cart is empty or could not be fetched." };
    }
    
    const codOrderId = `cod_${randomBytes(6).toString('hex')}`;

    const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: user.id,
            status: 'pending-shipment',
            shipping_address: JSON.stringify(shippingAddress),
            razorpay_order_id: codOrderId,
            payment_method: 'COD',
        })
        .select()
        .single();
    
    if (orderError || !newOrder) {
        console.error("Error creating COD order:", orderError);
        return { success: false, message: `Failed to save order. Reason: ${orderError?.message || 'Unknown'}` };
    }

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
        await supabase.from('orders').delete().eq('id', newOrder.id);
        return { success: false, message: `Failed to save order items. Reason: ${itemsError.message}` };
    }
    
    // Construct the FullOrderDetails object to send to Shiprocket
     const fullOrder: FullOrderDetails = {
        id: newOrder.id,
        created_at: newOrder.created_at,
        status: 'pending-shipment',
        shipping_address: newOrder.shipping_address,
        razorpay_order_id: newOrder.razorpay_order_id,
        shipment_id: null,
        shiprocket_order_id: null,
        payment_method: 'COD',
        items: cart.items.map(ci => ({...ci, product_id: ci.product.id, price_at_purchase: ci.product.price})),
        user: { display_name: userProfile?.display_name || '', email: userProfile?.email || '' }
    };
    
    // Automatically push to Shiprocket
    const pushResult = await sendOrderToShiprocket(fullOrder);

    if (!pushResult.success) {
        console.error(`Failed to auto-push COD order ${newOrder.id} to Shiprocket: ${pushResult.message}`);
    }

    await supabase.from('cart_items').delete().eq('user_id', user.id);

    return { success: true, message: "COD Order created successfully.", shipmentId: pushResult.shipmentId };
}
