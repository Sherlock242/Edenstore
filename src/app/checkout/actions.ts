// src/app/checkout/actions.ts
'use server';

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { getCartItems } from '../cart/actions';
import { getShippingRates, pushOrderToShiprocket } from '@/lib/shiprocket-client';
import { randomBytes } from 'crypto';
import type { FullOrderDetails } from '@/app/admin/orders/actions';
import type { OrderItem } from '../track/actions';


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

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "User not authenticated. Cannot create order." };
    }

    const cart = await getCartItems();
    if (!cart.success || !cart.items || !cart.items.length) {
        return { success: false, message: "Cart is empty or could not be fetched. Cannot create order." };
    }
    
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
        return { success: false, message: `Failed to save order items. Reason: ${itemsError.message}` };
    }

    // AUTOMATICALLY PUSH TO SHIPROCKET
    const fullOrderDetails: FullOrderDetails = {
        id: newOrder.id.toString(),
        created_at: newOrder.created_at,
        status: newOrder.status as 'processing',
        shipping_address: newOrder.shipping_address,
        razorpay_order_id: newOrder.razorpay_order_id,
        payment_method: newOrder.payment_method as 'Prepaid',
        user: { display_name: user.email || '', email: user.email || '' },
        items: cart.items.map(item => ({...item, price_at_purchase: item.product.price, product_id: item.product.id})),
        shipment_id: null,
        shiprocket_order_id: null
    };

    const pushResult = await pushOrderToShiprocket(fullOrderDetails);
    
    if (pushResult.success && pushResult.payload) {
        const { shipment_id, order_id } = pushResult.payload;
        await supabase
            .from('orders')
            .update({ shipment_id, shiprocket_order_id: order_id })
            .eq('id', newOrder.id);
    } else {
        console.error("Failed to push order to Shiprocket automatically:", pushResult.message);
        // Don't fail the entire order, just log it. The admin can push it manually.
    }


    await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);
    
    return { success: true, message: "Payment verified and order created successfully.", razorpayOrderId: razorpay_order_id };
}


type CreateCodOrderPayload = {
    shippingAddress: any;
}
export async function createCodOrder(payload: CreateCodOrderPayload): Promise<{success: boolean; message: string; razorpayOrderId?: string}> {
    const { shippingAddress } = payload;
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "User not authenticated. Cannot create order." };
    }

    const cart = await getCartItems();
    if (!cart.success || !cart.items || cart.items.length === 0) {
        return { success: false, message: "Cart is empty or could not be fetched." };
    }
    
    const codOrderId = `cod_${randomBytes(6).toString('hex')}`;

    const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: user.id,
            status: 'processing',
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
        return { success: false, message: `Failed to save order items. Reason: ${itemsError.message}` };
    }

    // AUTOMATICALLY PUSH TO SHIPROCKET
     const fullOrderDetails: FullOrderDetails = {
        id: newOrder.id.toString(),
        created_at: newOrder.created_at,
        status: newOrder.status as 'processing',
        shipping_address: newOrder.shipping_address,
        razorpay_order_id: newOrder.razorpay_order_id,
        payment_method: newOrder.payment_method as 'COD',
        user: { display_name: user.email || '', email: user.email || '' },
        items: cart.items.map(item => ({...item, price_at_purchase: item.product.price, product_id: item.product.id})),
        shipment_id: null,
        shiprocket_order_id: null
    };

    const pushResult = await pushOrderToShiprocket(fullOrderDetails);
    
    if (pushResult.success && pushResult.payload) {
        const { shipment_id, order_id } = pushResult.payload;
        await supabase
            .from('orders')
            .update({ shipment_id, shiprocket_order_id: order_id })
            .eq('id', newOrder.id);
    } else {
        console.error("Failed to push order to Shiprocket automatically:", pushResult.message);
    }

    await supabase.from('cart_items').delete().eq('user_id', user.id);

    return { success: true, message: "COD Order created successfully.", razorpayOrderId: codOrderId };
}
