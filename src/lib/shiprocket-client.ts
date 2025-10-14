
// src/lib/shiprocket-client.ts
'use server';

import type { OrderDetails } from "@/app/track/actions";

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
    channel_id: string; // Add this
    billing_customer_name: string;
    billing_last_name: string;
... (rest of the properties)
    billing_address: string;
    billing_city: string;
    billing_state: string;
    billing_country: string;
    billing_pincode: string;
    billing_email: string;
    billing_phone: string;
    order_items: ShipmentOrderItem[];
    payment_method: 'Prepaid' | 'COD';
    sub_total: number;
    length: number;
    breadth: number;
    height: number;
    weight: number;
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

// Function to create a shipment
export async function createShipment(payload: ShipmentPayload): Promise<{success: boolean; message: string; payload?: ShipmentSuccessPayload}> {
    const token = await getShiprocketToken();
    if (!token) {
        return { success: false, message: "Could not authenticate with Shiprocket." };
    }

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
            console.error("Shiprocket Shipment Error:", responseData);
            const errorMessage = responseData.errors ? JSON.stringify(responseData.errors) : responseData.message;
            return { success: false, message: errorMessage || "Failed to create shipment." };
        }
        
        return { success: true, message: "Shipment created successfully.", payload: responseData };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error("Error creating Shiprocket shipment:", error);
        return { success: false, message: errorMessage };
    }
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
