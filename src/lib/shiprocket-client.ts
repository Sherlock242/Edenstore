
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
            console.error("Shiprocket Auth Error:", await response.json());
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
}

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
    payment_method: 'Prepaid' | 'COD';
    shipping_charges: number;
    giftwrap_charges: number;
    transaction_charges: number;
    total_discount: number;
    sub_total: number;
    length: number;
    breadth: number;
    height: number;
    weight: number; // in kgs
}

type ShipmentSuccessPayload = {
    order_id: number;
    shipment_id: number;
    status: string;
    status_code: number;
    awb_code: string; // This is the tracking number!
    courier_company_id: number;
    courier_name: string;
}

type ShippingRatePayload = {
  pickup_postcode: string;
  delivery_postcode: string;
  weight: number; // in kg
  cod: 0 | 1; // 1 for COD, 0 for Prepaid
};

type CourierData = {
    rate: number;
    // ... other properties we might use later
};

type ServiceabilityResponse = {
    status: number;
    data: {
        available_courier_companies: CourierData[];
    };
    // ... other properties
}

export async function getShippingRates(payload: ShippingRatePayload): Promise<{ success: boolean; message: string; rate?: number }> {
  const token = await getShiprocketToken();
  if (!token) {
    return { success: false, message: "Could not authenticate with Shiprocket." };
  }

  try {
    const { pickup_postcode, delivery_postcode, weight, cod } = payload;
    const query = new URLSearchParams({
        pickup_postcode,
        delivery_postcode,
        weight: weight.toString(),
        cod: cod.toString(),
    }).toString();
    
    const response = await fetch(`${SHIPROCKET_API_URL}/courier/serviceability/?${query}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });

    const responseData = await response.json();

    if (!response.ok || responseData.status !== 200) {
        console.error("Shiprocket Serviceability Error:", responseData);
        return { success: false, message: responseData.message || "Could not fetch shipping rates." };
    }
    
    const availableCouriers = responseData.data?.available_courier_companies || [];
    
    if (availableCouriers.length === 0) {
        return { success: false, message: "No couriers available for this pincode." };
    }
    
    // Find the cheapest rate
    const cheapestCourier = availableCouriers.reduce((min: CourierData | null, courier: CourierData) => {
        if (!min || courier.rate < min.rate) {
            return courier;
        }
        return min;
    }, null);
    
    return { success: true, message: "Rate fetched.", rate: cheapestCourier?.rate };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error("Error fetching Shiprocket rates:", error);
    return { success: false, message: errorMessage };
  }
}


export async function trackShipmentById(shipmentId: string) {
    const token = await getShiprocketToken();
    if (!token) return null;

    try {
        const response = await fetch(`${SHIPROCKET_API_URL}/tracking/${shipmentId}`, {
             headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            }
        });
        if (!response.ok) {
            console.error("Shiprocket Tracking Error:", await response.json());
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error("Error tracking shipment:", error);
        return null;
    }
}

type PickupRequestResponse = {
    pickup_status: string;
    pickup_scheduled_date: string;
    pickup_token_number: string;
    status: number;
}

export async function requestShipmentPickup(shipmentIds: number[], pickupDate: string): Promise<{success: boolean; message: string; response?: PickupRequestResponse}> {
    const token = await getShiprocketToken();
    if (!token) {
        return { success: false, message: "Could not authenticate with Shiprocket." };
    }

    try {
        const response = await fetch(`${SHIPROCKET_API_URL}/orders/pickup/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                shipment_id: shipmentIds,
                pickup_date: pickupDate, // YYYY-MM-DD format
            }),
        });

        const responseData = await response.json();
        
        if (!response.ok || responseData.status_code !== 200) {
            console.error("Shiprocket Pickup Request Error:", responseData);
            const errorMessage = responseData.message || "Failed to schedule pickup.";
            return { success: false, message: errorMessage };
        }

        return { success: true, message: "Pickup scheduled successfully.", response: responseData };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error("Error requesting Shiprocket pickup:", error);
        return { success: false, message: errorMessage };
    }
}


export async function pushOrderToShiprocket(order: FullOrderDetails): Promise<{success: boolean; message: string; payload?: ShipmentSuccessPayload}> {
    const token = await getShiprocketToken();
    if (!token) {
        return { success: false, message: "Could not authenticate with Shiprocket." };
    }

    const shippingAddress = JSON.parse(order.shipping_address as string);
    const totalAmount = order.items.reduce((acc, item) => acc + item.price_at_purchase * item.quantity, 0);
    const totalWeight = order.items.reduce((acc, item) => acc + (item.product.weight * item.quantity), 0);
    const pickupLocation = process.env.SHIPROCKET_PICKUP_NAME || 'Primary';
    
    // Provide a default channel ID if the environment variable is not set.
    // The user can later configure this in their .env file if they have multiple channels.
    const channelId = process.env.SHIPROCKET_CHANNEL_ID || '3937090'; // Defaulting to a common "Custom" channel type.

    const orderItemsForShipment = order.items.map(item => ({
      name: item.product.name,
      sku: `${item.product.id}-${item.size}`.slice(0, 49), // SKU max length is 50
      units: item.quantity,
      selling_price: item.price_at_purchase,
      hsn: 49011010, // Example HSN, can be made dynamic later
    }));

    const payload: ShipmentPayload = {
        order_id: order.id,
        order_date: format(new Date(order.created_at), 'yyyy-MM-dd HH:mm'),
        pickup_location: pickupLocation,
        channel_id: channelId, 
        comment: `Order from anistore`,
        billing_customer_name: shippingAddress.firstName || "N/A",
        billing_last_name: shippingAddress.lastName || " ", // Must not be empty
        billing_address: shippingAddress.address,
        billing_address_2: "",
        billing_city: shippingAddress.city,
        billing_pincode: shippingAddress.pincode,
        billing_state: shippingAddress.state,
        billing_country: shippingAddress.country,
        billing_email: shippingAddress.email,
        billing_phone: shippingAddress.phone,
        shipping_is_billing: true,
        order_items: orderItemsForShipment,
        payment_method: order.payment_method || 'Prepaid',
        shipping_charges: 0,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: 0,
        sub_total: totalAmount,
        length: 10,
        breadth: 10,
        height: 2,
        weight: totalWeight > 0 ? totalWeight : 0.1, // Ensure weight > 0
    };

    try {
        const response = await fetch(`${SHIPROCKET_API_URL}/orders/create/adhoc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (!response.ok || responseData.status_code !== 200) {
            console.error("Shiprocket Push Order Failed. Payload sent:", JSON.stringify(payload, null, 2));
            console.error("Shiprocket Push Order Error Response:", JSON.stringify(responseData, null, 2));
            const errorMessage = responseData.message || (responseData.errors ? JSON.stringify(responseData.errors) : "Failed to push order for an unknown reason.");
            return { success: false, message: errorMessage };
        }
        
        return { success: true, message: "Order pushed successfully.", payload: responseData };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error("Error pushing order to Shiprocket:", error);
        return { success: false, message: errorMessage };
    }
}

    