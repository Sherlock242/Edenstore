--
-- Create a table for public user profiles
--
create table users (
  id uuid references auth.users not null primary key,
  email text unique,
  display_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

--
-- Create a table for products
--
create table products (
  id serial primary key,
  name text not null,
  description text,
  price numeric(10, 2) not null,
  category text,
  popularity integer default 0,
  release_date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

--
-- Create a table for product images, with a hint for AI
--
create table product_images (
  id serial primary key,
  product_id integer references products(id) on delete cascade not null,
  url text not null,
  hint text, -- For AI image generation fallbacks
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

--
-- Create a table for available product sizes
--
create table product_sizes (
    id serial primary key,
    product_id integer references products(id) on delete cascade not null,
    size text not null,
    unique(product_id, size)
);

--
-- Create a table for available product colors
--
create table product_colors (
    id serial primary key,
    product_id integer references products(id) on delete cascade not null,
    color text not null,
    unique(product_id, color)
);

--
-- Create a table for customer orders
--
create table orders (
  id serial primary key,
  user_id uuid references auth.users not null,
  total_price numeric(10, 2) not null,
  status text default 'processing', -- e.g., processing, shipped, delivered, cancelled
  shipping_address jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

--
-- Create a table for items within an order (line items)
--
create table order_items (
  id serial primary key,
  order_id integer references orders(id) on delete cascade not null,
  product_id integer references products(id) not null,
  quantity integer not null,
  price_at_purchase numeric(10, 2) not null, -- Price of the product when the order was placed
  size text,
  color text,
  unique(order_id, product_id, size, color)
);

--
-- Create a table for user wishlists
--
create table wishlist_items (
  id serial primary key,
  user_id uuid references auth.users not null,
  product_id integer references products(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, product_id)
);

--
-- Set up Row Level Security (RLS)
--
alter table users enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_sizes enable row level security;
alter table product_colors enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table wishlist_items enable row level security;

--
-- Policies for 'users' table
--
create policy "Users can see their own profile" on users
  for select using (auth.uid() = id);
create policy "Users can update their own profile" on users
  for update using (auth.uid() = id);

--
-- Policies for 'products' and related tables (public access)
--
create policy "Allow public read access on products" on products
  for select using (true);
create policy "Allow public read access on product_images" on product_images
  for select using (true);
create policy "Allow public read access on product_sizes" on product_sizes
    for select using (true);
create policy "Allow public read access on product_colors" on product_colors
    for select using (true);


--
-- Policies for 'orders' table
--
create policy "Users can view their own orders" on orders
  for select using (auth.uid() = user_id);
create policy "Users can create orders" on orders
  for insert with check (auth.uid() = user_id);

--
-- Policies for 'order_items' table
--
create policy "Users can view their own order items" on order_items
  for select using (exists (
    select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()
  ));
create policy "Users can create order items for their orders" on order_items
  for insert with check (exists (
    select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()
  ));

--
-- Policies for 'wishlist_items' table
--
create policy "Users can view their own wishlist" on wishlist_items
  for select using (auth.uid() = user_id);
create policy "Users can manage their own wishlist items" on wishlist_items
  for all using (auth.uid() = user_id);

--
-- Function to automatically create a user profile when a new user signs up in Firebase Auth
--
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

--
-- Trigger to execute the function after a new user is created
--
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

--
-- Create Storage Bucket and Policies
--
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Allow public read access on product images"
on storage.objects for select
to public
using ( bucket_id = 'product-images' );

create policy "Allow authenticated users to upload product images"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'product-images' );

    