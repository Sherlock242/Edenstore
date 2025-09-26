
"use server";

import { revalidatePath } from 'next/cache';
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

// This function now needs to fetch from Supabase
export async function getProducts(): Promise<Product[]> {
    const { data: productsData, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        category,
        popularity,
        release_date,
        product_images ( id, url, hint ),
        product_sizes ( size ),
        product_colors ( color )
      `)
      .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }

    // Transform the data to match the Product type
    return productsData.map((p: any) => ({
        id: p.id.toString(),
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.category,
        popularity: p.popularity,
        releaseDate: p.release_date,
        images: p.product_images.map((img: any) => ({ id: img.id.toString(), url: img.url, hint: img.hint })),
        sizes: p.product_sizes.map((s: any) => s.size),
        colors: p.product_colors.map((c: any) => c.color),
    }));
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
    error?: PostgrestError | { message: string } | null;
    product?: Product;
}

export async function addProduct(data: ProductFormValues): Promise<ServerResponse> {
    const { image, ...productData } = data;
    
    // 1. Upload image to Supabase Storage
    const fileExt = image.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
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

    // 3. Insert product data into the 'products' table
    const { data: newProductData, error: productInsertError } = await supabase
        .from('products')
        .insert({
            name: productData.name,
            description: productData.description,
            price: Number(productData.price),
            category: productData.category,
            release_date: new Date().toISOString(),
        })
        .select()
        .single();

    if (productInsertError) {
        console.error('Error inserting product:', productInsertError);
        return { success: false, message: 'Failed to add product to database.', error: productInsertError };
    }

    const productId = newProductData.id;

    // 4. Insert image data into 'product_images' table
    const { error: imageInsertError } = await supabase
        .from('product_images')
        .insert({
            product_id: productId,
            url: imageUrl,
            hint: productData.imageHint,
        });

    if (imageInsertError) {
        console.error('Error inserting product image:', imageInsertError);
        // Optionally, handle cleanup of product or image if this step fails
        return { success: false, message: 'Failed to save product image.', error: imageInsertError };
    }

    // For simplicity, we'll add some default sizes and colors. In a real app, this would be part of the form.
    const defaultSizes = ['S', 'M', 'L', 'XL'];
    const defaultColors = ['Black', 'White'];

    const sizesToInsert = defaultSizes.map(size => ({ product_id: productId, size }));
    const colorsToInsert = defaultColors.map(color => ({ product_id: productId, color }));

    await supabase.from('product_sizes').insert(sizesToInsert);
    await supabase.from('product_colors').insert(colorsToInsert);

    revalidatePath('/');
    revalidatePath('/products');
    revalidatePath('/admin/add-product');

    // Fetch the newly created product to return it
    const finalProduct = await getProducts().then(products => products.find(p => p.id === productId.toString()));


    return {
        success: true,
        message: 'Product added successfully!',
        product: finalProduct,
    };
}
