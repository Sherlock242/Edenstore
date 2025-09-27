-- Add columns to store Razorpay IDs in the orders table
ALTER TABLE public.orders
ADD COLUMN razorpay_order_id TEXT,
ADD COLUMN razorpay_payment_id TEXT;

-- Add the total_amount column to the orders table
ALTER TABLE public.orders
ADD COLUMN total_amount NUMERIC NOT NULL;
