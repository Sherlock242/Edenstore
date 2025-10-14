// This file is for server-side actions only
"use server";

import { cookies } from 'next/headers';
import { addProduct, deleteProduct, getProducts, getProductsForSearch, updateProduct } from './actions';
import { getHeroImageUrl, getSiteName, updateHeroImage, updateSiteName } from './admin/settings/actions';

// Wrapper server actions for client components

// Product Actions
export async function getProductsClient() {
    const cookieStore = cookies();
    return await getProducts(cookieStore);
}

export async function getProductsForSearchClient() {
    const cookieStore = cookies();
    return await getProductsForSearch(cookieStore);
}

export async function addProductAction(data: any) {
    const cookieStore = cookies();
    return await addProduct(cookieStore, data);
}

export async function updateProductAction(data: any) {
    const cookieStore = cookies();
    return await updateProduct(cookieStore, data);
}

export async function deleteProductClient(productId: string) {
    const cookieStore = cookies();
    return await deleteProduct(cookieStore, productId);
}

// Site Settings Actions
export async function getHeroImageUrlClient() {
    const cookieStore = cookies();
    return getHeroImageUrl(cookieStore);
}

export async function getSiteNameClient() {
    const cookieStore = cookies();
    return getSiteName(cookieStore);
}

export async function updateHeroImageAction(image: File) {
    const cookieStore = cookies();
    return updateHeroImage(cookieStore, image);
}

export async function updateSiteNameAction(name: string) {
    const cookieStore = cookies();
    return updateSiteName(cookieStore, name);
}
