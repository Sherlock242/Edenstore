
"use server";

import { revalidatePath } from 'next/cache';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { supabase } from '@/lib/supabase-client';
import type { PostgrestError } from '@supabase/supabase-js';

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  images: { id: string; url: string; hint: string }[];
  sizes: string[];
  colors: string[];
  category: string;
  popularity: number;
  releaseDate: string; // ISO 8601 format
};

function getImageUrl(id: string) {
    const image = PlaceHolderImages.find(img => img.id === id);
    return image ? { id, url: image.imageUrl, hint: image.imageHint } : { id: 'not-found', url: 'https://placehold.co/400x500', hint: 'placeholder image' };
}

// In a real application, this would be a database.
let products: Product[] = [
  {
    id: "1",
    name: "Gojo's Infinity Tee",
    description: "Unleash your inner sorcerer with this tee inspired by the strongest Jujutsu Sorcerer. Features a stunning design of the Limitless and Six Eyes.",
    price: 29.99,
    images: [getImageUrl('product-1')],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "White", "Navy"],
    category: "Jujutsu Kaisen",
    popularity: 95,
    releaseDate: "2024-05-15T00:00:00Z",
  },
  {
    id: "2",
    name: "Titan Slayer Hoodie",
    description: "Dedicate your heart to humanity with this hoodie, featuring the emblem of the Survey Corps. Perfect for scouting beyond the walls.",
    price: 49.99,
    images: [getImageUrl('product-2')],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Khaki", "Black", "Green"],
    category: "Attack on Titan",
    popularity: 92,
    releaseDate: "2024-05-10T00:00:00Z",
  },
  {
    id: "3",
    name: "Pirate King's Crew Shirt",
    description: "Join the Straw Hat crew on their quest for the One Piece. This shirt features the iconic Jolly Roger of the future Pirate King.",
    price: 25.99,
    images: [getImageUrl('product-3')],
    sizes: ["S", "M", "L", "XL", "XXL", "3XL"],
    colors: ["Red", "Black", "White"],
    category: "One Piece",
    popularity: 98,
    releaseDate: "2024-04-20T00:00:00Z",
  },
  {
    id: "4",
    name: "Z Warrior's Spirit Tee",
    description: "Power up your wardrobe with this tee celebrating the legendary Z Warriors. Features a dynamic design of Earth's mightiest heroes.",
    price: 27.99,
    images: [getImageUrl('product-4')],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Orange", "Blue", "Black"],
    category: "Dragon Ball",
    popularity: 88,
    releaseDate: "2024-05-01T00:00:00Z",
  },
  {
    id: "5",
    name: "Leaf Village Legend Tee",
    description: "Show your ninja way with this tee inspired by the Hidden Leaf Village. Features the iconic spiral symbol.",
    price: 24.99,
    images: [getImageUrl('product-5')],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "Orange", "White"],
    category: "Naruto",
    popularity: 90,
    releaseDate: "2024-03-15T00:00:00Z",
  },
  {
    id: "6",
    name: "Alchemist's Mark Hoodie",
    description: "Embrace the law of equivalent exchange with this hoodie featuring the Flamel symbol. A must-have for any state alchemist.",
    price: 54.99,
    images: [getImageUrl('product-6')],
    sizes: ["M", "L", "XL"],
    colors: ["Red", "Black"],
    category: "Fullmetal Alchemist",
    popularity: 85,
    releaseDate: "2024-02-28T00:00:00Z",
  },
  {
    id: "7",
    name: "Hunter's License Shirt",
    description: "Prove you're a licensed Hunter with this exclusive tee. The first step to finding your Ging is looking the part.",
    price: 30.99,
    images: [getImageUrl('product-7')],
    sizes: ["S", "M", "L"],
    colors: ["White", "Green"],
    category: "Hunter x Hunter",
    popularity: 87,
    releaseDate: "2024-04-05T00:00:00Z",
  },
  {
    id: "8",
    name: "Demon Corp Uniform Tee",
    description: "Join the ranks of the Demon Slayer Corps. This tee is designed after the iconic uniform, ready for any mission.",
    price: 29.99,
    images: [getImageUrl('product-8')],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "Dark Blue"],
    category: "Demon Slayer",
    popularity: 93,
    releaseDate: "2024-03-22T00:00:00Z",
  },
  {
    id: "9",
    name: "Sailor Guardian Bow Tee",
    description: "In the name of the moon, you need this tee! Features the iconic bow of the Pretty Guardian.",
    price: 26.99,
    images: [getImageUrl('product-9')],
    sizes: ["S", "M", "L"],
    colors: ["White", "Pink", "Blue"],
    category: "Sailor Moon",
    popularity: 80,
    releaseDate: "2023-12-20T00:00:00Z",
  },
  {
    id: "10",
    name: "Pro Hero Academia Hoodie",
    description: "Go beyond! Plus Ultra! This hoodie is inspired by the top hero academy, perfect for aspiring heroes.",
    price: 45.99,
    images: [getImageUrl('product-10')],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Blue", "Gray", "Black"],
    category: "My Hero Academia",
    popularity: 89,
    releaseDate: "2024-01-18T00:00:00Z",
  },
  {
    id: "11",
    name: "EVA Unit-01 Shirt",
    description: "Get in the robot! This shirt features a schematic design of the legendary Evangelion Unit-01.",
    price: 32.99,
    images: [getImageUrl('product-11')],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "Purple"],
    category: "Neon Genesis Evangelion",
    popularity: 86,
    releaseDate: "2024-02-10T00:00:00Z",
  },
  {
    id: "12",
    name: "Cyberpunk Edgerunner Tee",
    description: "Live on the edge in Night City. This tee features the iconic Sandevistan spine design.",
    price: 28.99,
    images: [getImageUrl('product-12')],
    sizes: ["M", "L", "XL", "XXL"],
    colors: ["Black", "Yellow"],
    category: "Cyberpunk: Edgerunners",
    popularity: 91,
    releaseDate: "2024-05-20T00:00:00Z",
  },
];

export async function getProducts() {
    return Promise.resolve(products);
}

export type ProductFormValues = {
  name: string;
  description: string;
  price: number;
  category: string;
  imageHint: string;
  image: File;
};

type ServerResponse = {
    success: boolean;
    message: string;
    error?: PostgrestError | null;
    product?: Product;
}

export async function addProduct(data: ProductFormValues): Promise<ServerResponse> {
    const { image, ...productData } = data;
    
    // 1. Upload image to Supabase Storage
    const fileExt = image.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `product-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, image);

    if (uploadError) {
        console.error('Error uploading image:', uploadError);
        return { success: false, message: 'Failed to upload image.', error: uploadError };
    }

    // 2. Get public URL for the uploaded image
    const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);
    
    if (!urlData) {
        return { success: false, message: 'Failed to get image URL.' };
    }
    
    const imageUrl = urlData.publicUrl;

    // 3. Create new product object with the new image URL
    const newProduct: Product = {
        id: `${products.length + 1}`,
        name: productData.name,
        description: productData.description,
        price: Number(productData.price),
        images: [
        {
            id: `product-${products.length + 1}`,
            url: imageUrl,
            hint: productData.imageHint,
        },
        ],
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        colors: ['Black', 'White'],
        category: productData.category,
        popularity: 75,
        releaseDate: new Date().toISOString(),
    };

    // This part would insert into a database in a real app.
    // For now, we prepend to the in-memory array.
    products.unshift(newProduct);

    revalidatePath('/');
    revalidatePath('/products');

    return {
        success: true,
        message: 'Product added successfully!',
        product: newProduct,
    };
}

    