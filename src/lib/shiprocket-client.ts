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
...
```