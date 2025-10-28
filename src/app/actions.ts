
"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/cookies';
import { createClient as createAdminClient } from '@supabase/supabase-js';


export type ProductVariant = {
  color: string;
  quantity: number;
}
export type ProductSize = {
  size: string;
  variants: ProductVariant[];
}

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  images: { id: string; url: string; hint: string }[];
  sizes: ProductSize[];
  category: string;
  popularity: number;
  releaseDate: string; // ISO 8601 format
  weight: number; // in kg
};

// This function now needs to be passed the cookieStore from a Server Component
export const getProducts = async (cookieStore: ReadonlyRequestCookies): Promise<Product[]> => {
    const supabase = createClient(cookieStore);
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
        weight,
        product_images ( id, url, hint ),
        product_variants ( size, color, quantity )
      `)
      .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }

    // Transform the data to match the new Product type with nested variants
    return productsData.map((p: any) => {
        const sizesMap = new Map<string, ProductVariant[]>();
        
        p.product_variants.forEach((variant: any) => {
            if (!sizesMap.has(variant.size)) {
                sizesMap.set(variant.size, []);
            }
            sizesMap.get(variant.size)!.push({
                color: variant.color,
                quantity: variant.quantity,
            });
        });
        
        const sizes: ProductSize[] = Array.from(sizesMap.entries()).map(([size, variants]) => ({
            size,
            variants,
        }));

        return {
            id: p.id.toString(),
            name: p.name,
            description: p.description,
            price: p.price,
            category: p.category,
            popularity: p.popularity,
            releaseDate: p.release_date,
            weight: p.weight || 0.5,
            images: p.product_images.map((img: any) => ({ id: img.id.toString(), url: img.url, hint: img.hint })),
            sizes: sizes,
        }
    });
};

export type SearchProduct = Pick<Product, 'id' | 'name' | 'category'> & { image: Product['images'][0] };

export const getProductsForSearch = async (cookieStore: ReadonlyRequestCookies): Promise<SearchProduct[]> => {
    const supabase = createClient(cookieStore);
    const { data: productsData, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        category,
        product_images ( id, url, hint )
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
            id: p.product_images[0]?.id || '',
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
  sizes: { 
    size: string; 
    colors: { color: string; quantity: number }[]
  }[];
  images: { file: File; hint: string; }[];
};

export type UpdateProductFormValues = Omit<ProductFormValues, 'images'> & {
  id: string;
  images?: { file: File; hint: string; }[];
};


type ServerResponse = {
    success: boolean;
    message: string;
    error?: { message: string } | null;
    product?: Product;
}

export async function addProduct(cookieStore: ReadonlyRequestCookies, data: ProductFormValues): Promise<ServerResponse> {
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
    const { images, sizes, ...productData } = data;
    
    // 1. Insert product data
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

    // 2. Upload images
    const uploadedImages = [];
    for (const image of images) {
        const fileExt = image.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        const filePath = `product-images/${fileName}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('product-images')
            .upload(filePath, image.file);

        if (uploadError) {
            await supabaseAdmin.from('products').delete().eq('id', productId);
            return { success: false, message: `Failed to upload image ${image.file.name}.`, error: { message: uploadError.message } };
        }

        const { data: urlData } = supabaseAdmin.storage.from('product-images').getPublicUrl(filePath);
        if (!urlData) return { success: false, message: `Failed to get URL for image ${image.file.name}.` };
        
        uploadedImages.push({ product_id: productId, url: urlData.publicUrl, hint: image.hint });
    }
    
    // 3. Insert image data
    if (uploadedImages.length > 0) {
        const { error: imageInsertError } = await supabaseAdmin.from('product_images').insert(uploadedImages);
        if (imageInsertError) return { success: false, message: 'Failed to save product images.', error: { message: imageInsertError.message } };
    }


    // 4. Insert product variants
    const variantsToInsert = sizes.flatMap(s => 
        s.colors.map(c => ({
            product_id: productId,
            size: s.size,
            color: c.color,
            quantity: Number(c.quantity)
        }))
    );
    await supabaseAdmin.from('product_variants').insert(variantsToInsert);

    revalidatePath('/');
    revalidatePath('/products');
    revalidatePath('/admin/add-product');

    // Fetch the newly created product to return it
    const { data: finalProductData, error: finalProductError } = await supabaseAdmin
      .from('products')
      .select(`
        id, name, description, price, category, popularity, release_date, weight,
        product_images ( id, url, hint ),
        product_variants ( size, color, quantity )
      `)
      .eq('id', productId)
      .single();

    if (finalProductError || !finalProductData) {
        return { success: true, message: 'Product added, but failed to fetch final details.' };
    }
    
     const sizesMap = new Map<string, ProductVariant[]>();
    finalProductData.product_variants.forEach((variant: any) => {
        if (!sizesMap.has(variant.size)) sizesMap.set(variant.size, []);
        sizesMap.get(variant.size)!.push({ color: variant.color, quantity: variant.quantity });
    });
    const finalSizes: ProductSize[] = Array.from(sizesMap.entries()).map(([size, variants]) => ({ size, variants }));

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
        sizes: finalSizes,
    };

    return { success: true, message: 'Product added successfully!', product: finalProduct };
}


export async function updateProduct(cookieStore: ReadonlyRequestCookies, data: UpdateProductFormValues): Promise<ServerResponse> {
  const supabase = createClient(cookieStore);
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const { id, images, sizes, ...productData } = data;
  const bucketName = 'product-images';

  // Handle image replacement if new images are provided
  if (images && images.length > 0 && images.some(i => i.file)) {
    // 1. Get old image URLs from the database.
    const { data: oldImagesData } = await supabaseAdmin.from('product_images').select('url').eq('product_id', id);

    // 2. Delete old image records from the database first.
    await supabaseAdmin.from('product_images').delete().eq('product_id', id);

    // 3. Upload new images.
    const newUploadedImages = [];
    for (const image of images) {
        if (!image.file) continue;
        const fileExt = image.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        const filePath = `product-images/${fileName}`;

        const { error: uploadError } = await supabaseAdmin.storage.from(bucketName).upload(filePath, image.file);
        if (uploadError) return { success: false, message: `Failed to upload image ${image.file.name}.`, error: { message: uploadError.message } };

        const { data: urlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);
        newUploadedImages.push({ product_id: id, url: urlData!.publicUrl, hint: image.hint });
    }

    // 4. Insert new image records into the database.
    if (newUploadedImages.length > 0) {
        const { error: imageInsertError } = await supabaseAdmin.from('product_images').insert(newUploadedImages);
        if (imageInsertError) return { success: false, message: 'Failed to save new product images.', error: { message: imageInsertError.message } };
    }
    
    // 5. Delete old files from storage
    if (oldImagesData && oldImagesData.length > 0) {
      const oldImagePaths = oldImagesData.map(img => {
        try {
          const url = new URL(img.url);
          const pathStartIndex = url.pathname.indexOf(bucketName) + bucketName.length + 1;
          return url.pathname.substring(pathStartIndex);
        } catch (e) {
          console.error("Invalid URL for old image, cannot delete:", img.url);
          return null;
        }
      }).filter((p): p is string => p !== null);

      if (oldImagePaths.length > 0) {
        const { error: removeError } = await supabaseAdmin.storage.from(bucketName).remove(oldImagePaths);
        if (removeError) {
          // Log error but don't fail the whole operation, as DB is already updated.
          console.error("Failed to remove old product images from storage, but continuing:", removeError.message);
        }
      }
    }
  }
  
  const { error: productUpdateError } = await supabase
    .from('products')
    .update({
      name: productData.name,
      description: productData.description,
      price: Number(productData.price),
      category: productData.category,
      weight: Number(productData.weight),
    })
    .eq('id', id);

  if (productUpdateError) return { success: false, message: 'Failed to update product details.', error: { message: productUpdateError.message } };

  // Update variants
  await supabase.from('product_variants').delete().eq('product_id', id);
  const variantsToInsert = sizes.flatMap(s => 
    s.colors.map(c => ({
      product_id: id,
      size: s.size,
      color: c.color,
      quantity: Number(c.quantity)
    }))
  );
  await supabase.from('product_variants').insert(variantsToInsert);

  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath(`/products/${id}`);
  revalidatePath('/admin/add-product');

  // Fetch the fully updated product
  const { data: finalProductData, error: finalProductError } = await supabase
    .from('products')
    .select(`
      id, name, description, price, category, popularity, release_date, weight,
      product_images ( id, url, hint ),
      product_variants ( size, color, quantity )
    `)
    .eq('id', id)
    .single();
  
  if (finalProductError || !finalProductData) return { success: true, message: 'Product updated, but failed to fetch final details.' };
  
    const sizesMap = new Map<string, ProductVariant[]>();
    finalProductData.product_variants.forEach((variant: any) => {
        if (!sizesMap.has(variant.size)) sizesMap.set(variant.size, []);
        sizesMap.get(variant.size)!.push({ color: variant.color, quantity: variant.quantity });
    });
    const finalSizes: ProductSize[] = Array.from(sizesMap.entries()).map(([size, variants]) => ({ size, variants }));

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
      sizes: finalSizes,
    };

  return { success: true, message: 'Product updated successfully!', product: finalProduct };
}


export async function deleteProduct(cookieStore: ReadonlyRequestCookies, productId: string): Promise<ServerResponse> {
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const bucketName = 'product-images';

  const { data: productData, error: fetchError } = await supabaseAdmin
    .from('products')
    .select('id, product_images(url)')
    .eq('id', productId)
    .single();

  if (fetchError || !productData) return { success: false, message: 'Could not find the product to delete.' };

  // Cascade delete should handle this, but for explicit safety:
  await supabaseAdmin.from('reviews').delete().eq('product_id', productId);
  await supabaseAdmin.from('cart_items').delete().eq('product_id', productId);
  await supabaseAdmin.from('order_items').delete().eq('product_id', productId);
  await supabaseAdmin.from('product_variants').delete().eq('product_id', productId);
  
  if (productData.product_images && productData.product_images.length > 0) {
      const imagePaths = productData.product_images.map(img => {
        try {
            const url = new URL(img.url);
            const pathStartIndex = url.pathname.indexOf(bucketName) + bucketName.length + 1;
            return url.pathname.substring(pathStartIndex);
        } catch(e) { return null; }
      }).filter((p): p is string => p !== null);
      
      if(imagePaths.length > 0) {
          const { error: removeError } = await supabaseAdmin.storage.from(bucketName).remove(imagePaths);
          if (removeError) console.error("Failed to remove product images from storage:", removeError.message);
      }
  }
  
  await supabaseAdmin.from('product_images').delete().eq('product_id', productId);

  // Finally, delete the product itself
  const { error: deleteError } = await supabaseAdmin.from('products').delete().eq('id', productId);
  if (deleteError) return { success: false, message: 'Failed to delete product.', error: { message: deleteError.message } };

  revalidatePath('/admin/add-product');
  revalidatePath('/products');
  revalidatePath('/');

  return { success: true, message: 'Product deleted successfully.' };
}


export async function deleteUserAccount(cookieStore: ReadonlyRequestCookies): Promise<ServerResponse> {
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "User not found or not authenticated." };
    }

    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );

    // First, delete the user from the public.users table.
    const { error: deleteProfileError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', user.id);

    if (deleteProfileError) {
         console.error('Error deleting user profile:', deleteProfileError);
         // We can choose to continue even if this fails, as the auth user is the critical part.
    }
    
    // Then, delete the user from the auth.users table.
    const { error: deleteAuthUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteAuthUserError) {
        console.error('Error deleting user from auth:', deleteAuthUserError);
        return { success: false, message: 'Failed to delete user account.', error: { message: deleteAuthUserError.message } };
    }
    
    // Finally, sign the user out to clear the session cookie.
    await supabase.auth.signOut();
    
    revalidatePath('/');

    return { success: true, message: 'Account deleted successfully.' };
}

    

    

    

    
