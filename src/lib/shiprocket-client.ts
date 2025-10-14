// src/lib/shiprocket-client.ts
'use server';

import type { FullOrderDetails } from '@/app/admin/orders/actions';
import { format } from 'date-fns';

const SHIPROCKET_API_URL = "https://apiv2.shiprocket.in/v1/external";

type ShiprocketAuthResponse = {
    token: string;
}

// Function to get the authentication token from Shiprocket
async function getShiprocketToken(): Promise<string | null> {
    try {
        if (!process.env.SHIPROCKET_API_EMAIL || !process.env.SHIPROCKET_API_PASSWORD) {
            console.error("Shiprocket API credentials are not set in .env file.");
            return null;
        }
        
        const response = await fetch(`${SHIPROCKET_API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: process.env.SHIPROCKET_API_EMAIL,
                password: process.env.SHIPROCKET_API_PASSWORD,
            }),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Shiprocket Auth Error:", errorBody);
            return null;
        }

        const data: ShiprocketAuthResponse = await response.json();
        return data.token;

    } catch (error) {
        console.error("Error getting Shiprocket token:", error);
        return null;
    }
}


type ShipmentOrderItem = {
    name: string;
    sku: string;
    units: number;
    selling_price: number;
    hsn: number;
};

export type ShipmentPayload = {
    order_id: string; // Your internal order ID
    order_date: string;
    pickup_location: string;
    channel_id: string;
    comment: string;
    billing_customer_name: string;
    billing_last_name: string;
    billing_address: string;
    billing_address_2: string;
    billing_city: string;
    billing_pincode: string;
    billing_state: string;
    billing_country: string;
    billing_email: string;
    billing_phone: string;
    shipping_is_billing: boolean;
    order_items: ShipmentOrderItem[];
    payment_method: 'COD' | 'Prepaid';
    shipping_charges: number;
    giftwrap_charges: number;
    transaction_charges: number;
    total_discount: number;
    sub_total: number;
    length: number;
    breadth: number;
    height: number;
    weight: number; // in kgs
};

export async function pushOrderToShiprocket(order: FullOrderDetails): Promise<{ success: boolean; payload?: { order_id: number; shipment_id: number; }; message: string }> {
    const token = await getShiprocketToken();
    if (!token) {
        return { success: false, message: "Could not authenticate with Shiprocket." };
    }
    
    // Extract shipping details and handle potential parsing errors
    let shippingDetails;
    try {
        shippingDetails = JSON.parse(order.shipping_address as string);
    } catch (e) {
        return { success: false, message: "Invalid shipping address format." };
    }

    // Split name into first and last name
    const nameParts = shippingDetails.firstName.split(' ');
    const lastName = nameParts.length > 1 ? nameParts.pop() : ' '; // Use a space if no last name
    const firstName = nameParts.join(' ');


    // Prepare order items, ensuring string lengths are within Shiprocket's API limits
    const orderItemsForShipment: ShipmentOrderItem[] = order.items.map(item => ({
        name: item.product.name.substring(0, 100), // Max length 100
        sku: `${item.product.id}-${item.size}`.substring(0, 50), // Max length 50
        units: item.quantity,
        selling_price: item.price_at_purchase,
        hsn: 610910, // A common HSN code for cotton t-shirts, replace if you have specific ones
    }));

    // Calculate subtotal from the items
    const sub_total = order.items.reduce((acc, item) => acc + (item.price_at_purchase * item.quantity), 0);
    
    // Prepare the full payload for Shiprocket
    const payload: ShipmentPayload = {
        order_id: order.razorpay_order_id,
        order_date: format(new Date(order.created_at), 'yyyy-MM-dd HH:mm'),
        pickup_location: process.env.SHIPROCKET_PICKUP_NAME || "Santosh",
        channel_id: process.env.SHIPROCKET_CHANNEL_ID || "8434256",
        comment: "ANISTORE Order",
        billing_customer_name: firstName,
        billing_last_name: lastName,
        billing_address: shippingDetails.address,
        billing_address_2: '',
        billing_city: shippingDetails.city,
        billing_pincode: shippingDetails.pincode,
        billing_state: shippingDetails.state,
        billing_country: shippingDetails.country,
        billing_email: shippingDetails.email,
        billing_phone: shippingDetails.phone,
        shipping_is_billing: true,
        order_items: orderItemsForShipment,
        payment_method: order.payment_method === 'COD' ? 'COD' : 'Prepaid',
        shipping_charges: 0, 
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: 0,
        sub_total: sub_total,
        length: 10,
        breadth: 10,
        height: 5,
        weight: order.items.reduce((acc, item) => acc + (item.product.weight * item.quantity), 0.1)
    };

    try {
        const response = await fetch(`${SHIPROCKET_API_URL}/orders/create/push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
            cache: 'no-store'
        });
        
        const responseBody = await response.json();

        if (!response.ok || responseBody.status_code !== 200) {
             console.error("Shiprocket Push Order Failed. Payload Sent:", JSON.stringify(payload, null, 2));
             console.error("Shiprocket Response:", JSON.stringify(responseBody, null, 2));
             const errorMessage = responseBody.message || "Failed to push order for an unknown reason.";
             return { success: false, message: errorMessage };
        }

        return { success: true, payload: responseBody.payload, message: 'Order pushed successfully.' };

    } catch (error) {
        console.error("Error pushing order to Shiprocket:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message: errorMessage };
    }
}



export async function getShippingRates(params: { pickup_postcode: string, delivery_postcode: string, weight: number, cod: 0 | 1 }): Promise<{ success: boolean; message: string; rate?: number }> {
    const token = await getShiprocketToken();
    if (!token) return { success: false, message: "Could not authenticate with Shiprocket." };

    const { pickup_postcode, delivery_postcode, weight, cod } = params;
    const subTotal = 100; // Example subtotal, as it's required by the API

    const url = new URL(`${SHIPROCKET_API_URL}/courier/serviceability/`);
    url.searchParams.append('pickup_postcode', pickup_postcode);
    url.searchParams.append('delivery_postcode', delivery_postcode);
    url.searchParams.append('weight', weight.toString());
    url.searchParams.append('cod', cod.toString());
    url.searchParams.append('declared_value', subTotal.toString());

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            cache: 'no-store'
        });

        const responseBody = await response.json();

        if (!response.ok || responseBody.status !== 200) {
            console.error("Shiprocket Rate Error:", responseBody);
            return { success: false, message: responseBody.message || "Could not fetch shipping rates." };
        }
        
        // Find the cheapest rate
        const rates = responseBody.data.available_courier_companies;
        if (!rates || rates.length === 0) {
            return { success: false, message: "No courier service available for this pincode." };
        }

        const cheapestRate = rates.reduce((min: any, current: any) => {
            return (current.rate < min.rate) ? current : min;
        }, rates[0]);


        return { success: true, rate: cheapestRate.rate, message: 'Rate fetched.' };

    } catch (error) {
        console.error("Error fetching shipping rates:", error);
        return { success: false, message: 'An unexpected error occurred.' };
    }
}


export async function requestShipmentPickup(shipmentIds: number[], pickupDate: string): Promise<{ success: boolean; message: string; response?: any; }> {
    const token = await getShiprocketToken();
    if (!token) return { success: false, message: "Could not authenticate with Shiprocket." };

    try {
        const response = await fetch(`${SHIPROCKET_API_URL}/courier/generate/pickup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                shipment_id: shipmentIds,
                pickup_date: pickupDate, 
            }),
            cache: 'no-store'
        });

        const responseBody = await response.json();
        
        if (!response.ok) {
            console.error("Shiprocket Pickup Request Error:", responseBody);
            return { success: false, message: responseBody.message || "Failed to schedule pickup." };
        }

        return { success: true, response: responseBody, message: 'Pickup request successful.' };
    } catch (error) {
        console.error("Error requesting shipment pickup:", error);
        return { success: false, message: "An unexpected server error occurred." };
    }
}


export async function trackShipmentById(shipmentId: string): Promise<any> {
    const token = await getShiprocketToken();
    if (!token) return null;

    try {
        const response = await fetch(`${SHIPROCKET_API_URL}/tracking/${shipmentId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-store'
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Error tracking shipment:", error);
        return null;
    }
}
