
"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { supabase as supabaseClient } from '@/lib/supabase-client';

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
  sizes: { size: string; quantity: number; }[];
  colors: string[];
  category: string;
  popularity: number;
  releaseDate: string; // ISO 8601 format
  weight: number; // in kg
};

// This function now needs to fetch from Supabase
export const getProducts = async (): Promise<Product[]> => {
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
        weight,
        product_images ( id, url, hint ),
        product_sizes ( size, quantity ),
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
        weight: p.weight || 0.5, // Default weight if not set
        images: p.product_images.map((img: any) => ({ id: img.id.toString(), url: img.url, hint: img.hint })),
        sizes: p.product_sizes.map((s: any) => ({size: s.size, quantity: s.quantity})),
        colors: p.product_colors.map((c: any) => c.color),
    }));
};

export type SearchProduct = Pick<Product, 'id' | 'name' | 'category'> & { image: Product['images'][0] };

export const getProductsForSearch = async (): Promise<SearchProduct[]> => {
    const { data: productsData, error } = await supabaseAdmin
      .from('products')
      .select(`
        id,
        name,
        category,
        product_images ( url, hint )
      `)
      .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching products for search:', error);
        return [];
    }
    
    // Transform data to a lighter format for search suggestions
    return productsData.map((p: any) => ({
        id: p.id.toString(),
        name: p.name,
        category: p.category,
        image: {
            id: '', // Not needed for search
            url: p.product_images[0]?.url || '',
            hint: p.product_images[0]?.hint || '',
        }
    }));
}


export type ProductFormValues = {
  name: string;
  description: string;
  price: number;
  category: string;
  weight: number;
  sizes: { size: string; quantity: number; }[];
  images: { file: File; hint: string; }[];
};

export type UpdateProductFormValues = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  weight: number;
  sizes: { size: string; quantity: number; }[];
  images?: { file: File; hint: string; }[];
};


type ServerResponse = {
    success: boolean;
    message: string;
    error?: { message: string } | null;
    product?: Product;
}

export async function addProduct(data: ProductFormValues): Promise<ServerResponse> {
    const { images, sizes, ...productData } = data;
    
    // 1. Insert product data into the 'products' table using the admin client
    const { data: newProductData, error: productInsertError } = await supabaseAdmin
        .from('products')
        .insert({
            name: productData.name,
            description: productData.description,
            price: Number(productData.price),
            category: productData.category,
            weight: Number(productData.weight),
            release_date: new Date().toISOString(),
        })
        .select()
        .single();

    if (productInsertError) {
        console.error('Error inserting product:', productInsertError);
        return { success: false, message: 'Failed to add product to database.', error: { message: productInsertError.message } };
    }

    const productId = newProductData.id;

    // 2. Upload images and collect their URLs
    const uploadedImages = [];
    for (const image of images) {
        const fileExt = image.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        const filePath = `product-images/${fileName}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('product-images')
            .upload(filePath, image.file);

        if (uploadError) {
            console.error('Error uploading image:', uploadError);
            // In a real app, you might want to roll back the product creation here
            return { success: false, message: `Failed to upload image ${image.file.name}.`, error: { message: uploadError.message } };
        }

        const { data: urlData } = supabaseAdmin.storage
            .from('product-images')
            .getPublicUrl(filePath);

        if (!urlData) {
            return { success: false, message: `Failed to get URL for image ${image.file.name}.` };
        }

        uploadedImages.push({
            product_id: productId,
            url: urlData.publicUrl,
            hint: image.hint,
        });
    }

    // 3. Insert all image data into 'product_images' table
    if (uploadedImages.length > 0) {
        const { error: imageInsertError } = await supabaseAdmin
            .from('product_images')
            .insert(uploadedImages);

        if (imageInsertError) {
            console.error('Error inserting product images:', imageInsertError);
            return { success: false, message: 'Failed to save product images.', error: { message: imageInsertError.message } };
        }
    }


    // 4. Insert sizes and quantities
    const sizesToInsert = sizes.map(s => ({ product_id: productId, size: s.size, quantity: Number(s.quantity) }));
    await supabaseAdmin.from('product_sizes').insert(sizesToInsert);

    // For simplicity, we'll add some default colors. In a real app, this would be part of the form.
    const defaultColors = ['Black', 'White'];
    const colorsToInsert = defaultColors.map(color => ({ product_id: productId, color }));
    await supabaseAdmin.from('product_colors').insert(colorsToInsert);

    revalidatePath('/');
    revalidatePath('/products');
    revalidatePath('/admin/add-product');

    // Fetch the newly created product to return it
    const { data: finalProductData, error: finalProductError } = await supabaseAdmin
      .from('products')
      .select(`
        id, name, description, price, category, popularity, release_date, weight,
        product_images ( id, url, hint ),
        product_sizes ( size, quantity ),
        product_colors ( color )
      `)
      .eq('id', productId)
      .single();

    if (finalProductError || !finalProductData) {
        console.error('Error fetching final product:', finalProductError);
        return { success: true, message: 'Product added, but failed to fetch final details.' };
    }
    
    const finalProduct: Product = {
        id: finalProductData.id.toString(),
        name: finalProductData.name,
        description: finalProductData.description,
        price: finalProductData.price,
        category: finalProductData.category,
        popularity: finalProductData.popularity,
        releaseDate: finalProductData.release_date,
        weight: finalProductData.weight,
        images: finalProductData.product_images.map((img: any) => ({ id: img.id.toString(), url: img.url, hint: img.hint })),
        sizes: finalProductData.product_sizes.map((s: any) => ({size: s.size, quantity: s.quantity})),
        colors: finalProductData.product_colors.map((c: any) => c.color),
    };


    return {
        success: true,
        message: 'Product added successfully!',
        product: finalProduct,
    };
}


export async function updateProduct(data: UpdateProductFormValues): Promise<ServerResponse> {
  const { id, images, sizes, ...productData } = data;

  // Handle image replacement if new images are provided
  if (images && images.length > 0) {
    // 1. Fetch old image records to delete them from storage
    const { data: oldImages, error: fetchOldImagesError } = await supabaseAdmin
      .from('product_images')
      .select('url')
      .eq('product_id', id);

    if (fetchOldImagesError) {
      return { success: false, message: 'Could not fetch old images for deletion.', error: { message: fetchOldImagesError.message } };
    }

    // 2. Delete old image files from Supabase Storage
    if (oldImages && oldImages.length > 0) {
        const oldImagePaths = oldImages.map(img => {
            try {
                // Correctly extract the path from the URL
                const url = new URL(img.url);
                const pathParts = url.pathname.split('/product-images/');
                return `product-images/${pathParts[pathParts.length - 1]}`;
            } catch (e) {
                console.error(`Invalid URL for old image, cannot extract path: ${img.url}`);
                return null;
            }
        }).filter((p): p is string => p !== null);

        if(oldImagePaths.length > 0) {
          const { error: storageError } = await supabaseAdmin.storage
              .from('product-images')
              .remove(oldImagePaths.map(p => p.replace('product-images/', '')));
              
          if (storageError) {
              console.error('Error deleting old product images from storage:', storageError);
              return { success: false, message: 'Failed to delete old images from storage.', error: { message: storageError.message } };
          }
        }
    }

    // 3. Delete old image records from the 'product_images' table
    await supabaseAdmin.from('product_images').delete().eq('product_id', id);

    // 4. Upload new images and collect their data
    const newUploadedImages = [];
    for (const image of images) {
        const fileExt = image.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        const filePath = `product-images/${fileName}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('product-images')
            .upload(filePath, image.file);

        if (uploadError) {
            return { success: false, message: `Failed to upload image ${image.file.name}.`, error: { message: uploadError.message } };
        }

        const { data: urlData } = supabaseAdmin.storage
            .from('product-images')
            .getPublicUrl(filePath);
        
        newUploadedImages.push({
            product_id: id,
            url: urlData!.publicUrl,
            hint: image.hint,
        });
    }

    // 5. Insert new image records into 'product_images' table
    if (newUploadedImages.length > 0) {
        const { error: imageInsertError } = await supabaseAdmin
            .from('product_images')
            .insert(newUploadedImages);

        if (imageInsertError) {
            return { success: false, message: 'Failed to save new product images.', error: { message: imageInsertError.message } };
        }
    }
  }
  
  // Update product details in 'products' table
  const { error: productUpdateError } = await supabaseAdmin
    .from('products')
    .update({
      name: productData.name,
      description: productData.description,
      price: Number(productData.price),
      category: productData.category,
      weight: Number(productData.weight),
    })
    .eq('id', id);

  if (productUpdateError) {
    console.error('Error updating product:', productUpdateError);
    return { success: false, message: 'Failed to update product details.', error: { message: productUpdateError.message } };
  }

  // Update sizes
  // 1. Delete existing sizes for the product
  await supabaseAdmin.from('product_sizes').delete().eq('product_id', id);
  // 2. Insert new sizes
  const sizesToInsert = sizes.map(s => ({ product_id: id, size: s.size, quantity: Number(s.quantity) }));
  await supabaseAdmin.from('product_sizes').insert(sizesToInsert);


  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath(`/products/${id}`);
  revalidatePath('/admin/add-product');

  // Fetch the fully updated product to return it
  const { data: finalProductData, error: finalProductError } = await supabaseAdmin
    .from('products')
    .select(`
      id, name, description, price, category, popularity, release_date, weight,
      product_images ( id, url, hint ),
      product_sizes ( size, quantity ),
      product_colors ( color )
    `)
    .eq('id', id)
    .single();
  
  if (finalProductError || !finalProductData) {
    console.error('Error fetching updated product:', finalProductError);
    return { success: true, message: 'Product updated, but failed to fetch final details.' };
  }

  const finalProduct: Product = {
      id: finalProductData.id.toString(),
      name: finalProductData.name,
      description: finalProductData.description,
      price: finalProductData.price,
      category: finalProductData.category,
      popularity: finalProductData.popularity,
      releaseDate: finalProductData.release_date,
      weight: finalProductData.weight,
      images: finalProductData.product_images.map((img: any) => ({ id: img.id.toString(), url: img.url, hint: img.hint })),
      sizes: finalProductData.product_sizes.map((s: any) => ({size: s.size, quantity: s.quantity})),
      colors: finalProductData.product_colors.map((c: any) => c.color),
  };

  return {
    success: true,
    message: 'Product updated successfully!',
    product: finalProduct,
  };
}


export async function deleteProduct(productId: string): Promise<ServerResponse> {
  // First, fetch the product to get the image URLs for deletion from storage
  const { data: productData, error: fetchError } = await supabaseAdmin
    .from('products')
    .select('id, product_images(url)')
    .eq('id', productId)
    .single();

  if (fetchError || !productData) {
    console.error('Error fetching product for deletion:', fetchError);
    return { success: false, message: 'Could not find the product to delete.' };
  }

  // Delete images from Supabase Storage
  if (productData.product_images && productData.product_images.length > 0) {
      const imagePaths = productData.product_images.map(img => {
        try {
            const url = new URL(img.url);
            const pathParts = url.pathname.split('/product-images/');
            return `product-images/${pathParts[pathParts.length - 1]}`;
        } catch (e) {
            return null;
        }
      }).filter((p): p is string => p !== null);

      if(imagePaths.length > 0) {
        const { error: storageError } = await supabaseAdmin.storage
            .from('product-images')
            .remove(imagePaths.map(p => p.replace('product-images/', '')));

        if (storageError) {
            console.error('Error deleting product images from storage:', storageError);
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


export async function deleteUserAccount(): Promise<ServerResponse> {
    // We need the user's ID. To do this securely, we get the session on the server.
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        return { success: false, message: "User not found or not authenticated." };
    }

    // Use the admin client to delete the user from the auth schema.
    const { error: deleteAuthUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteAuthUserError) {
        console.error('Error deleting user from auth:', deleteAuthUserError);
        return { success: false, message: 'Failed to delete user account.', error: { message: deleteAuthUserError.message } };
    }

    // The trigger in the database should have already deleted the user from the public.users table.
    // We can now sign the user out on the client, although they are effectively logged out anyway.
    await supabaseClient.auth.signOut();
    
    revalidatePath('/');

    return { success: true, message: 'Account deleted successfully.' };
}
