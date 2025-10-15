
'use server';

import type { FullOrderDetails } from '@/app/admin/orders/actions';
import { format } from 'date-fns';

const SHIPROCKET_API_URL = "https://apiv2.shiprocket.in/v1/external";

let tokenCache = {
    token: null as string | null,
    expiresAt: 0,
};

// Function to get the authentication token from Shiprocket, with caching
async function getShiprocketToken(): Promise<string | null> {
    const now = Date.now();
    // Re-use token if it's not expired (Shiprocket tokens last for 10 days, we'll refresh every 9 days)
    if (tokenCache.token && now < tokenCache.expiresAt) {
        return tokenCache.token;
    }

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

        const data = await response.json();
        tokenCache = {
            token: data.token,
            // Set expiry to 9 days from now in milliseconds
            expiresAt: now + 9 * 24 * 60 * 60 * 1000,
        };
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

type ShipmentPayload = {
    order_id: string;
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
    
    let shippingDetails;
    try {
        shippingDetails = JSON.parse(order.shipping_address as string);
    } catch (e) {
        return { success: false, message: "Invalid shipping address format." };
    }

    const nameParts = (shippingDetails.firstName || '').split(' ').filter(Boolean);
    const lastName = nameParts.length > 1 ? nameParts.pop() || ' ' : (shippingDetails.lastName || ' ');
    const firstName = nameParts.join(' ');
    
    const totalOrderValue = order.items.reduce((acc, item) => acc + (item.price_at_purchase * item.quantity), 0);
    const totalQuantity = order.items.reduce((acc, item) => acc + item.quantity, 0);

    // To ensure the correct total is collected for COD and declared for prepaid,
    // we will send a single consolidated item to Shiprocket representing the full order value.
    const orderItemsForShipment: ShipmentOrderItem[] = [
      {
          name: `ANISTORE Order - ${order.razorpay_order_id}`.substring(0, 100),
          sku: `ANISTORE-${order.id}`.substring(0, 50),
          units: 1, // Consolidate into a single unit
          selling_price: totalOrderValue, // The full value of the products
          hsn: 610910,
      }
    ];

    const payload: ShipmentPayload = {
        order_id: order.razorpay_order_id,
        order_date: format(new Date(order.created_at), 'yyyy-MM-dd HH:mm'),
        pickup_location: process.env.SHIPROCKET_PICKUP_NAME || "Santosh",
        channel_id: "",
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
        sub_total: totalOrderValue, // This should be the grand total the customer paid or will pay
        length: 10,
        breadth: 10,
        height: 5,
        weight: order.items.reduce((acc, item) => acc + (item.product.weight * item.quantity), 0.1)
    };

    try {
        const response = await fetch(`${SHIPROCKET_API_URL}/orders/create/adhoc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
            cache: 'no-store'
        });
        
        const responseBody = await response.json();

        if (response.ok && responseBody.order_id && responseBody.shipment_id) {
             return { success: true, payload: { order_id: responseBody.order_id, shipment_id: responseBody.shipment_id }, message: 'Order pushed successfully.' };
        } else {
             console.error("Shiprocket Push Order Failed. Payload Sent:", JSON.stringify(payload, null, 2));
             console.error("Shiprocket Response:", JSON.stringify(responseBody, null, 2));
             
             let errorMessage = "Failed to push order to Shiprocket. Please check server logs.";
             if (responseBody.message) {
                 errorMessage = responseBody.message;
             } else if (responseBody.errors && Array.isArray(responseBody.errors) && responseBody.errors.length > 0) {
                 errorMessage = responseBody.errors.join(', ');
             } else if (responseBody.errors?.order_id) {
                 errorMessage = `Shiprocket Error: ${responseBody.errors.order_id}`;
             }
             
             return { success: false, message: errorMessage };
        }

    } catch (error) {
        console.error("Error pushing order to Shiprocket:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return { success: false, message: errorMessage };
    }
}

export async function getShippingRates(params: { pickup_postcode: string, delivery_postcode: string, weight: number, cod: 0 | 1, declared_value: number }): Promise<{ success: boolean; message: string; rate?: number }> {
    const token = await getShiprocketToken();
    if (!token) return { success: false, message: "Could not authenticate with Shiprocket." };

    const { pickup_postcode, delivery_postcode, weight, cod, declared_value } = params;

    const url = new URL(`${SHIPROCKET_API_URL}/courier/serviceability`);
    url.searchParams.append('pickup_postcode', pickup_postcode);
    url.searchParams.append('delivery_postcode', delivery_postcode);
    url.searchParams.append('weight', weight.toString());
    url.searchParams.append('cod', cod.toString());
    url.searchParams.append('declared_value', declared_value.toString());
    url.searchParams.append('is_return', '0');

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
        
        const rates = responseBody.data.available_courier_companies;
        if (!rates || rates.length === 0) {
            return { success: false, message: "No courier service available for this pincode." };
        }

        const cheapestRate = rates.reduce((min: any, current: any) => {
            // Shiprocket returns rate as a string, ensure they are numbers for comparison
            const currentRate = parseFloat(current.rate);
            const minRate = parseFloat(min.rate);
            return (currentRate < minRate) ? current : min;
        }, rates[0]);

        return { success: true, rate: parseFloat(cheapestRate.rate), message: 'Rate fetched.' };

    } catch (error) {
        console.error("Error fetching shipping rates:", error);
        return { success: false, message: 'An unexpected error occurred.' };
    }
}


export async function requestShipmentPickup(shipmentIds: number[]): Promise<{ success: boolean; message: string; response?: any; }> {
    const token = await getShiprocketToken();
    if (!token) return { success: false, message: "Could not authenticate with Shiprocket." };

    // Shiprocket requires pickup date in YYYY-MM-DD format, for the next day.
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 1);
    const formattedPickupDate = format(pickupDate, 'yyyy-MM-dd');

    try {
        const response = await fetch(`${SHIPROCKET_API_URL}/courier/generate/pickup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                shipment_id: shipmentIds,
                pickup_date: formattedPickupDate, 
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
        const response = await fetch(`${SHIPROCKET_API_URL}/courier/track/shipment/${shipmentId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-store'
        });
        if (!response.ok) {
            console.error(`Shiprocket tracking failed for shipment ${shipmentId}. Status: ${response.status}`);
            return null;
        };
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error tracking shipment:", error);
        return null;
    }
}


export async function assignCourierAndGenerateAwb(shipmentId: number): Promise<{ success: boolean; message: string; awb?: string }> {
    const token = await getShiprocketToken();
    if (!token) {
        return { success: false, message: "Could not authenticate with Shiprocket." };
    }

    try {
        const response = await fetch(`${SHIPROCKET_API_URL}/courier/assign/awb`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                shipment_id: shipmentId,
            }),
            cache: 'no-store'
        });

        const responseBody = await response.json();

        if (response.ok && responseBody.data?.awb_code) {
            return { success: true, awb: responseBody.data.awb_code, message: "AWB generated successfully." };
        } else {
            console.error("Shiprocket AWB Generation Error:", responseBody);
            // Try to provide a more specific error message if available
            const errorMessage = responseBody.awb_assign_error || responseBody.message || (responseBody.errors ? JSON.stringify(responseBody.errors) : "Failed to generate AWB.");
            return { success: false, message: errorMessage };
        }
    } catch (error) {
        console.error("Error generating AWB from Shiprocket:", error);
        return { success: false, message: "An unexpected server error occurred while generating AWB." };
    }
}

    