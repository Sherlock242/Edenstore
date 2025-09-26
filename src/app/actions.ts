
"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

// Create a new Supabase client with admin privileges for server-side operations
// This uses the service role key, which has full admin privileges.
// NEVER expose this key or use this client in the browser.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);


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
    const { data: productsData, error } = await supabaseAdmin
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
    error?: { message: string } | null;
    product?: Product;
}

export async function addProduct(data: ProductFormValues): Promise<ServerResponse> {
    const { image, ...productData } = data;
    
    // 1. Upload image to Supabase Storage using the admin client
    const fileExt = image.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `product-images/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
        .from('product-images')
        .upload(filePath, image);

    if (uploadError) {
        console.error('Error uploading image:', uploadError);
        return { success: false, message: 'Failed to upload image.', error: { message: uploadError.message } };
    }

    // 2. Get public URL for the uploaded image
    const { data: urlData } = supabaseAdmin.storage
        .from('product-images')
        .getPublicUrl(filePath);
    
    if (!urlData) {
        return { success: false, message: 'Failed to get image URL.' };
    }
    
    const imageUrl = urlData.publicUrl;

    // 3. Insert product data into the 'products' table using the admin client
    const { data: newProductData, error: productInsertError } = await supabaseAdmin
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
        return { success: false, message: 'Failed to add product to database.', error: { message: productInsertError.message } };
    }

    const productId = newProductData.id;

    // 4. Insert image data into 'product_images' table using the admin client
    const { error: imageInsertError } = await supabaseAdmin
        .from('product_images')
        .insert({
            product_id: productId,
            url: imageUrl,
            hint: productData.imageHint,
        });

    if (imageInsertError) {
        console.error('Error inserting product image:', imageInsertError);
        // Optionally, handle cleanup of product or image if this step fails
        return { success: false, message: 'Failed to save product image.', error: { message: imageInsertError.message } };
    }

    // For simplicity, we'll add some default sizes and colors. In a real app, this would be part of the form.
    const defaultSizes = ['S', 'M', 'L', 'XL'];
    const defaultColors = ['Black', 'White'];

    const sizesToInsert = defaultSizes.map(size => ({ product_id: productId, size }));
    const colorsToInsert = defaultColors.map(color => ({ product_id: productId, color }));

    await supabaseAdmin.from('product_sizes').insert(sizesToInsert);
    await supabaseAdmin.from('product_colors').insert(colorsToInsert);

    revalidatePath('/');
    revalidatePath('/products');
    revalidatePath('/admin/add-product');

    // Fetch the newly created product to return it
    const { data: finalProductData, error: finalProductError } = await supabaseAdmin
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
      .eq('id', productId)
      .single();

    if (finalProductError || !finalProductData) {
        console.error('Error fetching final product:', finalProductError);
        return { success: true, message: 'Product added, but failed to fetch final details.' };
    }
    
    const finalProduct = {
        id: finalProductData.id.toString(),
        name: finalProductData.name,
        description: finalProductData.description,
        price: finalProductData.price,
        category: finalProductData.category,
        popularity: finalProductData.popularity,
        releaseDate: finalProductData.release_date,
        images: finalProductData.product_images.map((img: any) => ({ id: img.id.toString(), url: img.url, hint: img.hint })),
        sizes: finalProductData.product_sizes.map((s: any) => s.size),
        colors: finalProductData.product_colors.map((c: any) => c.color),
    };


    return {
        success: true,
        message: 'Product added successfully!',
        product: finalProduct,
    };
}

export async function deleteProduct(productId: string): Promise<ServerResponse> {
  // First, fetch the product to get the image URL for deletion from storage
  const { data: productData, error: fetchError } = await supabaseAdmin
    .from('products')
    .select('id, product_images(url)')
    .eq('id', productId)
    .single();

  if (fetchError || !productData) {
    console.error('Error fetching product for deletion:', fetchError);
    return { success: false, message: 'Could not find the product to delete.' };
  }

  // Delete image from Supabase Storage
  if (productData.product_images && productData.product_images.length > 0) {
      const imageUrl = productData.product_images[0].url;
      const filePath = new URL(imageUrl).pathname.split('/product-images/').pop();
      if(filePath) {
        const { error: storageError } = await supabaseAdmin.storage
            .from('product-images')
            .remove([`product-images/${filePath}`]);

        if (storageError) {
            console.error('Error deleting product image from storage:', storageError);
            // Don't block product deletion if image deletion fails, but log it.
        }
      }
  }

  // Delete the product from the 'products' table.
  // Cascading delete should handle related tables (images, sizes, colors)
  const { error: deleteError } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', productId);

  if (deleteError) {
    console.error('Error deleting product:', deleteError);
    return { success: false, message: 'Failed to delete product.', error: { message: deleteError.message } };
  }

  revalidatePath('/admin/add-product');
  revalidatePath('/products');
  revalidatePath('/');

  return { success: true, message: 'Product deleted successfully.' };
}
