-- Add columns to store Razorpay IDs in the orders table
-- This is necessary to link a successful payment back to an order.

ALTER TABLE public.orders
ADD COLUMN razorpay_order_id TEXT,
ADD COLUMN razorpay_payment_id TEXT;
