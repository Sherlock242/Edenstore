// src/app/checkout/actions.ts
'use server';

import Razorpay from 'razorpay';
import crypto from 'crypto';

type CreateOrderPayload = {
    amount: number;
}
export async function createRazorpayOrder(payload: CreateOrderPayload): Promise<{success: boolean; order?: any; message: string}> {
    try {
        const instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });

        const options = {
            amount: payload.amount * 100, // amount in smallest currency unit
            currency: "USD", // You can change this
            receipt: `receipt_order_${new Date().getTime()}`,
        };

        const order = await instance.orders.create(options);
        
        if (!order) {
            return { success: false, message: "Could not create order." };
        }
        
        return { success: true, order, message: "Order created." };

    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        return { success: false, message: "An error occurred while creating the order." };
    }
}


type VerifyPaymentPayload = {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}
export async function verifyPayment(payload: VerifyPaymentPayload): Promise<{success: boolean; message: string}> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;
    const key_secret = process.env.RAZORPAY_KEY_SECRET!;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac("sha256", key_secret)
        .update(body.toString())
        .digest("hex");
    
    if (expectedSignature === razorpay_signature) {
         // Here is where you would typically:
         // 1. Find the order in your database using razorpay_order_id.
         // 2. Update its status to 'paid'.
         // 3. Create records for the purchased items.
         // 4. Clear the user's cart.
        return { success: true, message: "Payment verified successfully." };
    } else {
        return { success: false, message: "Payment verification failed." };
    }
}
