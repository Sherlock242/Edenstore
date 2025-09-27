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
    billing_customer_name: string;
    billing_last_name: string;
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
        
        return { success: true, message: "Shipment created successfully.", payload: responseData.payload };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error("Error creating Shiprocket shipment:", error);
        return { success: false, message: errorMessage };
    }
}

// You can add more functions here to track shipments, cancel orders, etc.
// For example:
export async function trackShipmentByAWB(awb: string) {
    const token = await getShiprocketToken();
    if (!token) return null;

    try {
        const response = await fetch(`${SHIPROCKET_API_URL}/tracking/${awb}`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    } catch (error) {
        console.error("Error tracking shipment:", error);
        return null;
    }
}
