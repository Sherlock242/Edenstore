
'use server';

import { supabase } from '@/lib/supabase-client';
import type { PostgrestError } from '@supabase/supabase-js';

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
        return { success: false, message: 'Failed to upload image.', error: { message: uploadError.message } };
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
        return { success: false, message: 'Failed to add product to database.', error: { message: productInsertError.message } };
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
        return { success: false, message: 'Failed to save product image.', error: { message: imageInsertError.message } };
    }

    // For simplicity, we'll add some default sizes and colors. In a real app, this would be part of the form.
    const defaultSizes = ['S', 'M', 'L', 'XL'];
    const defaultColors = ['Black', 'White'];

    const sizesToInsert = defaultSizes.map(size => ({ product_id: productId, size }));
    const colorsToInsert = defaultColors.map(color => ({ product_id: productId, color }));

    await supabase.from('product_sizes').insert(sizesToInsert);
    await supabase.from('product_colors').insert(colorsToInsert);

    // Revalidation is handled client-side or via other triggers for a better UX
    // revalidatePath('/');
    // revalidatePath('/products');
    // revalidatePath('/admin/add-product');

    return {
        success: true,
        message: 'Product added successfully!',
    };
}
