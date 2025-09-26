
// src/app/admin/add-product/actions.ts
'use server';
import {revalidatePath} from 'next/cache';

import {products as initialProducts} from '@/lib/product-data';

// This is a mock database. In a real application, you would use a real database.
let products = [...initialProducts];

export type ProductFormValues = {
  name: string;
  description: string;
  price: number;
  category: string;
  imageHint: string;
  image: FileList;
};

export async function addProduct(data: ProductFormValues) {
  const newProduct = {
    id: `${products.length + 1}`,
    name: data.name,
    description: data.description,
    price: Number(data.price),
    images: [
      {
        id: `product-${products.length + 1}`,
        // In a real app, you would upload data.image and store the URL
        url: `https://picsum.photos/seed/${products.length + 1}/400/500`,
        hint: data.imageHint,
      },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Black', 'White'],
    category: data.category,
    popularity: 75,
    releaseDate: new Date().toISOString(),
  };

  products.unshift(newProduct);

  // In a real app, you'd save this to a database.
  // For this demo, we're just revalidating the paths that show products.
  revalidatePath('/');
  revalidatePath('/products');

  return {
    success: true,
    message: 'Product added successfully!',
    product: newProduct,
  };
}
