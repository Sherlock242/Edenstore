-- Add Razorpay columns to the orders table

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
