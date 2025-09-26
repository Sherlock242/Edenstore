-- Enable Realtime for all tables
alter publication supabase_realtime add table products, product_images, users, orders, order_items, wishlist_items;

-- Products Table
-- Stores the main information about each product.
create table if not exists products (
  id bigserial primary key,
  name text not null,
  description text,
  price numeric(10, 2) not null,
  category text,
  popularity integer default 0,
  release_date timestamptz default now(),
  sizes text[] default '{}',
  colors text[] default '{}',
  created_at timestamptz default now()
);

-- Product Images Table
-- Stores multiple images for each product.
create table if not exists product_images (
  id bigserial primary key,
  product_id bigint not null references products(id) on delete cascade,
  url text not null,
  hint text,
  created_at timestamptz default now()
);

-- Create an index on product_id for faster lookups.
create index if not exists idx_product_images_product_id on product_images(product_id);

-- Users Table
-- Stores public user information, linked to Firebase Auth by user_id (UID).
create table if not exists users (
  id uuid primary key, -- This should be the Firebase Auth UID
  display_name text,
  email text,
  photo_url text,
  created_at timestamptz default now()
);

-- Orders Table
-- Stores order information for each customer.
create table if not exists orders (
  id bigserial primary key,
  user_id uuid references users(id) on delete set null,
  total_price numeric(10, 2) not null,
  status text not null default 'processing', -- e.g., processing, shipped, delivered
  shipping_address jsonb,
  created_at timestamptz default now()
);

-- Order Items Table
-- A junction table to store the products included in each order.
create table if not exists order_items (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  product_id bigint not null references products(id) on delete restrict,
  quantity integer not null,
  size text,
  color text,
  price_at_purchase numeric(10, 2) not null,
  unique (order_id, product_id, size, color)
);

-- Create indexes for faster lookups on orders.
create index if not exists idx_orders_user_id on orders(user_id);
create index if not exists idx_order_items_order_id on order_items(order_id);
create index if not exists idx_order_items_product_id on order_items(product_id);

-- Wishlist Items Table
-- Stores items in a user's wishlist.
create table if not exists wishlist_items (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  product_id bigint not null references products(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, product_id)
);

-- Create an index on user_id for faster wishlist lookups.
create index if not exists idx_wishlist_items_user_id on wishlist_items(user_id);

-- RLS Policies
-- Secure your data by enabling Row Level Security (RLS).
-- By default, no one can access the data. The policies below grant specific access.

-- Enable RLS for all tables
alter table products enable row level security;
alter table product_images enable row level security;
alter table users enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table wishlist_items enable row level security;

-- Policies for `products` and `product_images`
-- Anyone can read products and their images.
create policy "Allow public read access to products" on products for select using (true);
create policy "Allow public read access to product images" on product_images for select using (true);

-- Policies for `users`
-- Users can view their own profile.
-- Users can insert their own profile.
create policy "Allow individual user read access" on users for select using (auth.uid() = id);
create policy "Allow individual user insert access" on users for insert with check (auth.uid() = id);

-- Policies for `orders` and `order_items`
-- Users can only view their own orders.
-- Users can create orders for themselves.
create policy "Allow individual user read access to orders" on orders for select using (auth.uid() = user_id);
create policy "Allow individual user create access to orders" on orders for insert with check (auth.uid() = user_id);
create policy "Allow related order items read access" on order_items for select using (
  exists (
    select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()
  )
);
create policy "Allow related order items create access" on order_items for insert with check (
  exists (
    select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()
  )
);


-- Policies for `wishlist_items`
-- Users can view and manage their own wishlist.
create policy "Allow individual access to wishlist" on wishlist_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- Seed data (Optional)
-- You can use this to insert the initial products into your database.
-- Make sure to run the table creation scripts first.

-- Comment out or remove if you don't want to seed data.
/*
with product_data(name, description, price, category, popularity, release_date, sizes, colors) as (
  values
    ('Gojo''s Infinity Tee', 'Unleash your inner sorcerer with this tee inspired by the strongest Jujutsu Sorcerer. Features a stunning design of the Limitless and Six Eyes.', 29.99, 'Jujutsu Kaisen', 95, '2024-05-15T00:00:00Z', '{"S", "M", "L", "XL", "XXL"}', '{"Black", "White", "Navy"}'),
    ('Titan Slayer Hoodie', 'Dedicate your heart to humanity with this hoodie, featuring the emblem of the Survey Corps. Perfect for scouting beyond the walls.', 49.99, 'Attack on Titan', 92, '2024-05-10T00:00:00Z', '{"S", "M", "L", "XL"}', '{"Khaki", "Black", "Green"}'),
    ('Pirate King''s Crew Shirt', 'Join the Straw Hat crew on their quest for the One Piece. This shirt features the iconic Jolly Roger of the future Pirate King.', 25.99, 'One Piece', 98, '2024-04-20T00:00:00Z', '{"S", "M", "L", "XL", "XXL", "3XL"}', '{"Red", "Black", "White"}'),
    ('Z Warrior''s Spirit Tee', 'Power up your wardrobe with this tee celebrating the legendary Z Warriors. Features a dynamic design of Earth''s mightiest heroes.', 27.99, 'Dragon Ball', 88, '2024-05-01T00:00:00Z', '{"S", "M", "L", "XL"}', '{"Orange", "Blue", "Black"}'),
    ('Leaf Village Legend Tee', 'Show your ninja way with this tee inspired by the Hidden Leaf Village. Features the iconic spiral symbol.', 24.99, 'Naruto', 90, '2024-03-15T00:00:00Z', '{"S", "M", "L", "XL", "XXL"}', '{"Black", "Orange", "White"}'),
    ('Alchemist''s Mark Hoodie', 'Embrace the law of equivalent exchange with this hoodie featuring the Flamel symbol. A must-have for any state alchemist.', 54.99, 'Fullmetal Alchemist', 85, '2024-02-28T00:00:00Z', '{"M", "L", "XL"}', '{"Red", "Black"}'),
    ('Hunter''s License Shirt', 'Prove you''re a licensed Hunter with this exclusive tee. The first step to finding your Ging is looking the part.', 30.99, 'Hunter x Hunter', 87, '2024-04-05T00:00:00Z', '{"S", "M", "L"}', '{"White", "Green"}'),
    ('Demon Corp Uniform Tee', 'Join the ranks of the Demon Slayer Corps. This tee is designed after the iconic uniform, ready for any mission.', 29.99, 'Demon Slayer', 93, '2024-03-22T00:00:00Z', '{"S", "M", "L", "XL", "XXL"}', '{"Black", "Dark Blue"}'),
    ('Sailor Guardian Bow Tee', 'In the name of the moon, you need this tee! Features the iconic bow of the Pretty Guardian.', 26.99, 'Sailor Moon', 80, '2023-12-20T00:00:00Z', '{"S", "M", "L"}', '{"White", "Pink", "Blue"}'),
    ('Pro Hero Academia Hoodie', 'Go beyond! Plus Ultra! This hoodie is inspired by the top hero academy, perfect for aspiring heroes.', 45.99, 'My Hero Academia', 89, '2024-01-18T00:00:00Z', '{"S", "M", "L", "XL"}', '{"Blue", "Gray", "Black"}'),
    ('EVA Unit-01 Shirt', 'Get in the robot! This shirt features a schematic design of the legendary Evangelion Unit-01.', 32.99, 'Neon Genesis Evangelion', 86, '2024-02-10T00:00:00Z', '{"S", "M", "L", "XL"}', '{"Black", "Purple"}'),
    ('Cyberpunk Edgerunner Tee', 'Live on the edge in Night City. This tee features the iconic Sandevistan spine design.', 28.99, 'Cyberpunk: Edgerunners', 91, '2024-05-20T00:00:00Z', '{"M", "L", "XL", "XXL"}', '{"Black", "Yellow"}')
),
inserted_products as (
  insert into products (name, description, price, category, popularity, release_date, sizes, colors)
  select name, description, price, category, popularity, release_date::timestamptz, sizes, colors from product_data
  returning id, name
),
image_data(product_name, url, hint) as (
  values
    ('Gojo''s Infinity Tee', 'https://images.unsplash.com/photo-1630710478039-9c680b99f800?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxhbmltZSUyMGNoYXJhY3RlcnxlbnwwfHx8fDE3NTg5MDY2OTd8MA&ixlib=rb-4.1.0&q=80&w=1080', 'anime character'),
    ('Titan Slayer Hoodie', 'https://images.unsplash.com/photo-1635921479440-f7a2c10d2d54?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxmYW50YXN5JTIwd2FycmlvcnxlbnwwfHx8fDE3NTg4NDAzMTh8MA&ixlib=rb-4.1.0&q=80&w=1080', 'fantasy warrior'),
    ('Pirate King''s Crew Shirt', 'https://images.unsplash.com/photo-1633555442524-533869f78371?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxwaXJhdGUlMjBzaGlwfGVufDB8fHx8MTc1ODg3Njk5M3ww&ixlib=rb-4.1.0&q=80&w=1080', 'pirate ship'),
    ('Z Warrior''s Spirit Tee', 'https://images.unsplash.com/photo-1746470320824-6491a582096d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxlbmVyZ3klMjBibGFzdHxlbnwwfHx8fDE3NTg5MDY2OTh8MA&ixlib=rb-4.1.0&q=80&w=1080', 'energy blast'),
    ('Leaf Village Legend Tee', 'https://images.unsplash.com/photo-1677143051370-da2e52baa771?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw5fHxuaW5qYSUyMGNoYXJhY3RlcnxlbnwwfHx8fDE3NTg4NzEwMjZ8MA&ixlib=rb-4.1.0&q=80&w=1080', 'ninja character'),
    ('Alchemist''s Mark Hoodie', 'https://images.unsplash.com/photo-1551602174-f5c71dbceb83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxhbGNoZW15JTIwc3ltYm9sfGVufDB8fHx8MTc1ODkwNjY5OHww&ixlib=rb-4.1.0&q=80&w=1080', 'alchemy symbol'),
    ('Hunter''s License Shirt', 'https://images.unsplash.com/photo-1573145984254-d63c10037882?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxhZHZlbnR1cmVyJTIwYmFkZ2V8ZW58MHx8fHwxNzU4OTA2Njk3fDA&ixlib=rb-4.1.0&q=80&w=1080', 'adventurer badge'),
    ('Demon Corp Uniform Tee', 'https://images.unsplash.com/photo-1705932461994-6fb2b07f27dd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxkZW1vbiUyMHNsYXllcnxlbnwwfHx8fDE3NTg5MDY2OTh8MA&ixlib=rb-4.1.0&q=80&w=1080', 'demon slayer'),
    ('Sailor Guardian Bow Tee', 'https://images.unsplash.com/photo-1541971868625-37ae36051aaa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw1fHxtYWdpY2FsJTIwZ2lybHxlbnwwfHx8fDE3NTg3OTMyNDB8MA&ixlib=rb-4.1.0&q=80&w=1080', 'magical girl'),
    ('Pro Hero Academia Hoodie', 'https://images.unsplash.com/photo-1598472237441-b5422956195e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxzdXBlcmhlcm8lMjBzY2hvb2x8ZW58MHx8fHwxNzU4OTA2Njk4fDA&ixlib=rb-4.1.0&q=80&w=1080', 'superhero school'),
    ('EVA Unit-01 Shirt', 'https://images.unsplash.com/photo-1619697097549-595050e9eab7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw2fHxnaWFudCUyMHJvYm90fGVufDB8fHx8MTc1ODg1MTM2OHww&ixlib=rb-4.1.0&q=80&w=1080', 'giant robot'),
    ('Cyberpunk Edgerunner Tee', 'https://images.unsplash.com/photo-1534270804882-6b5048b1c1fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxjeWJlcnB1bmslMjBjaXR5fGVufDB8fHx8MTc1ODg3NTc2OHww&ixlib=rb-4.1.0&q=80&w=1080', 'cyberpunk city')
)
insert into product_images (product_id, url, hint)
select ip.id, id.url, id.hint
from image_data id
join inserted_products ip on ip.name = id.product_name;
*/
