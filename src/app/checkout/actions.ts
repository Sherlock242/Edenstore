// src/app/checkout/actions.ts
'use server';

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { getCartItems } from '../cart/actions';
import { assignCourierAndGenerateAwb, pushOrderToShiprocket, generateLabel } from '@/lib/shiprocket-client';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import type { FullOrderDetails } from '@/app/admin/orders/actions';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getShippingRates } from '@/lib/shiprocket-client';
import { type CartItem } from '@/contexts/cart-context';
import { getAnnouncementBarSettings } from '../admin/settings/actions';
import { revalidatePath } from 'next/cache';


async function updateInventory(supabase: any, cartItems: CartItem[]) {
    for (const item of cartItems) {
        // We now need to specify the color as well
        const { error: decrementError } = await supabase.rpc('decrement_product_quantity', {
            p_id: item.product.id,
            p_size: item.size,
            p_color: item.color,
            p_quantity: item.quantity,
        });

        if (decrementError) {
            console.error(`[INVENTORY_ERROR] Failed to decrement stock for product ID ${item.product.id}, size ${item.size}, color ${item.color}. Error: ${decrementError.message}`);
        }
    }
}


async function pushOrderAndAutomateShipment(order: FullOrderDetails) {
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
    // This function will run in the background and not block the user's request.
    // We are not returning anything from this function as it's a fire-and-forget operation.
    try {
        // Step 1: Push order to Shiprocket
        const pushResult = await pushOrderToShiprocket(order);
        if (!pushResult.success || !pushResult.payload) {
            console.error(`[AUTOMATION FAILED] Step 1: Could not push order ${order.id} to Shiprocket. Reason: ${pushResult.message}`);
            // Update status to 'processing-error' to indicate a problem
            await supabaseAdmin.from('orders').update({ status: 'processing-error' }).eq('id', order.id);
            return;
        }
        const { shipment_id: shipmentId, order_id: shiprocketOrderId } = pushResult.payload;

        // Step 2: Assign courier and get AWB
        const awbResult = await assignCourierAndGenerateAwb(shipmentId);
        if (!awbResult.success || !awbResult.awb) {
            console.error(`[AUTOMATION FAILED] Step 2: Could not generate AWB for shipment ${shipmentId}. Reason: ${awbResult.message}`);
            // The order is pushed, but AWB failed. We should still update the order with what we have and set status to 'processing' to signify it needs manual attention.
            await supabaseAdmin
                .from('orders')
                .update({ shipment_id: shipmentId, shiprocket_order_id: shiprocketOrderId, status: 'processing' })
                .eq('id', order.id);
            return;
        }

        // Step 3: Generate the shipping label
        const labelResult = await generateLabel([shipmentId]);
        if (!labelResult.success) {
            // Log the error but don't stop the process. The label can be generated manually later.
            console.warn(`[AUTOMATION WARNING] Step 3: Could not generate label for shipment ${shipmentId}. Reason: ${labelResult.message}`);
        }

        // Step 4: Save AWB, label URL, and update status to 'processing'
        const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({
                shipment_id: shipmentId,
                shiprocket_order_id: shiprocketOrderId,
                awb_code: awbResult.awb,
                shipping_label_url: labelResult.labelUrl, // Save the label URL
                status: 'processing'
            })
            .eq('id', order.id);

        if (updateError) {
            console.error(`[AUTOMATION FAILED] Step 4: Failed to save AWB/Label for order ${order.id}. Reason: ${updateError.message}`);
        } else {
            console.log(`[AUTOMATION SUCCESS] Order ${order.id} processed. Shipment ID: ${shipmentId}, AWB: ${awbResult.awb}`);
        }
    } catch (error) {
        console.error(`[AUTOMATION CRASH] A critical error occurred during shipment automation for order ${order.id}:`, error);
        await supabaseAdmin.from('orders').update({ status: 'processing-error' }).eq('id', order.id);
    }
}


export async function fetchShippingRatesAction(pincode: string): Promise<{success: boolean, message: string, rate?: number}> {
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
        cod: 0,
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
    totalAmount: number;
    shippingCost: number;
    couponCode: string | null;
    discountAmount: number;
}
export async function verifyPaymentAndCreateOrder(payload: VerifyPaymentPayload): Promise<{success: boolean; message: string; shipmentId?: number}> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, shippingAddress, totalAmount, shippingCost, couponCode, discountAmount } = payload;
    const key_secret = process.env.RAZORPAY_KEY_SECRET!;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac("sha256", key_secret)
        .update(body.toString())
        .digest("hex");
    
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
    
    // Use a transaction to ensure all or nothing is committed
    const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: user.id,
            status: 'pending-shipment',
            shipping_address: JSON.stringify(shippingAddress),
            razorpay_order_id: razorpay_order_id,
            razorpay_payment_id: razorpay_payment_id,
            payment_method: 'Prepaid',
            total_amount: totalAmount,
            shipping_cost: shippingCost,
            coupon_code: couponCode,
            discount_amount: discountAmount,
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
        // Rollback the order creation if items fail
        await supabase.from('orders').delete().eq('id', newOrder.id);
        return { success: false, message: `Failed to save order items. Reason: ${itemsError.message}` };
    }
    
    // All database writes successful, now update inventory
    await updateInventory(supabase, cart.items);

    // After updating inventory, revalidate paths for the products in the cart
    cart.items.forEach(item => {
        revalidatePath(`/products/${item.product.id}`);
    });
    revalidatePath('/products');
    revalidatePath('/');


    const fullOrder: FullOrderDetails = {
        id: newOrder.id,
        created_at: newOrder.created_at,
        status: 'pending-shipment',
        shipping_address: newOrder.shipping_address,
        razorpay_order_id: newOrder.razorpay_order_id,
        shipment_id: null,
        shiprocket_order_id: null,
        payment_method: 'Prepaid',
        awb_code: null,
        total_amount: newOrder.total_amount,
        discount_amount: newOrder.discount_amount,
        coupon_code: newOrder.coupon_code,
        items: cart.items.map(ci => ({...ci, product_id: ci.product.id, price_at_purchase: ci.product.price})),
        user: { display_name: userProfile?.display_name || '', email: userProfile?.email || '' }
    };

    // Don't await this, let it run in the background
    pushOrderAndAutomateShipment(fullOrder);
    
    // Clear the user's cart
    await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);
    
    return { success: true, message: "Payment verified and order created successfully." };
}

export async function validateCoupon(couponCode: string): Promise<{ success: boolean; message: string; discountPercent?: number }> {
    const cookieStore = cookies();
    if (couponCode.toLowerCase() !== 'akatsu10') {
        return { success: false, message: 'Invalid coupon code.' };
    }

    const announcementSettings = await getAnnouncementBarSettings(cookieStore);
    if (!announcementSettings.enabled) {
        return { success: false, message: 'This coupon is not currently active.' };
    }
    
    return { success: true, message: 'Coupon applied!', discountPercent: 10 };
}

