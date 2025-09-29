
// src/app/checkout/actions.ts
'use server';

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getCartItems } from '../cart/actions';
import { createShipment, getShippingRates } from '@/lib/shiprocket-client';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false }, db: { schema: 'public'} }
);

export async function fetchShippingRatesAction(pincode: string): Promise<{success: boolean, message: string, rate?: number}> {
    if (!pincode || pincode.length !== 6) {
        return { success: false, message: 'Invalid Pincode.' };
    }

    // Use environment variable or a default placeholder.
    // IMPORTANT: The user should set SHIPROCKET_PICKUP_POSTCODE in their environment.
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
        cod: 0 // Assuming prepaid for rate calculation. Shiprocket often has the same rate for both.
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
    if (!cart.success || !cart.items || cart.items.length === 0) {
        return { success: false, message: "Cart is empty or could not be fetched. Cannot create order." };
    }

    const totalAmount = cart.items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    const totalWeight = cart.items.reduce((acc, item) => acc + (item.product.weight * item.quantity), 0);
    
    // 4. Insert into 'orders' table
    const { data: newOrder, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
            user_id: user.id,
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

    const orderItemsForShipment = cart.items.map(item => ({
      name: item.product.name,
      sku: `${item.product.id}-${item.size}-${item.color}`,
      units: item.quantity,
      selling_price: item.product.price,
      hsn: 49011010, // Example HSN, can be made dynamic later
    }));

    // *** AUTOMATION STEP: Create Shipment with Shiprocket ***
    const shipmentResult = await createShipment({
      order_id: newOrder.id,
      order_date: newOrder.created_at,
      billing_customer_name: `${shippingAddress.firstName} ${shippingAddress.lastName || ''}`,
      billing_last_name: shippingAddress.lastName || shippingAddress.firstName,
      billing_address: shippingAddress.address,
      billing_city: shippingAddress.city,
      billing_state: shippingAddress.state || "N/A", // Use state from form, fallback to N/A
      billing_country: shippingAddress.country,
      billing_pincode: shippingAddress.pincode || "000000", // Use pincode from form, fallback to 000000
      billing_email: shippingAddress.email,
      billing_phone: shippingAddress.phone,
      order_items: orderItemsForShipment,
      payment_method: 'Prepaid',
      sub_total: totalAmount,
      length: 10,
      breadth: 10,
      height: 2,
      weight: totalWeight,
    });

    if (shipmentResult.success && shipmentResult.payload) {
      console.log('Shiprocket shipment created successfully:', shipmentResult.payload);
      // Save shipment details to our order
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          shipment_id: shipmentResult.payload.shipment_id,
          shiprocket_order_id: shipmentResult.payload.order_id,
        })
        .eq('id', newOrder.id);
      
      if(updateError) console.error("Failed to save shipment details to order:", updateError.message);
    } else {
        // Log if shipment creation fails but don't fail the entire order
        console.error("Shiprocket shipment creation failed:", shipmentResult.message);
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
    
    return { success: true, message: "Payment verified and order created successfully.", razorpayOrderId: newOrder.razorpay_order_id };
}
