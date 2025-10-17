
// This file is for server-side actions that can be called from client components
"use server";

import { cookies } from 'next/headers';
import { addProduct, deleteProduct, getProducts, getProductsForSearch, updateProduct, type ProductFormValues, type UpdateProductFormValues } from './actions';
import { 
    getHeroImageUrl, 
    getSiteName, 
    updateHeroImage, 
    updateSiteName, 
    getSiteLogoUrl, 
    updateSiteLogo, 
    getHeaderDisplayMode, 
    updateHeaderDisplayMode, 
    getAnnouncementBarSettings,
    updateAnnouncementBarSettings,
    type HeaderDisplayMode,
    type AnnouncementSettings
} from './admin/settings/actions';

// Product Actions
export async function getProductsClient() {
    const cookieStore = cookies();
    return await getProducts(cookieStore);
}

export async function getProductsForSearchClient() {
    const cookieStore = cookies();
    return await getProductsForSearch(cookieStore);
}

export async function addProductAction(data: ProductFormValues) {
    const cookieStore = cookies();
    return await addProduct(cookieStore, data);
}

export async function updateProductAction(data: UpdateProductFormValues) {
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

export async function getSiteLogoUrlClient() {
    const cookieStore = cookies();
    return await getSiteLogoUrl(cookieStore);
}

export async function updateSiteLogoAction(image: File) {
    const cookieStore = cookies();
    return await updateSiteLogo(cookieStore, image);
}

export async function getHeaderDisplayModeClient() {
    const cookieStore = cookies();
    return await getHeaderDisplayMode(cookieStore);
}

export async function updateHeaderDisplayModeAction(mode: HeaderDisplayMode) {
    const cookieStore = cookies();
    return await updateHeaderDisplayMode(cookieStore, mode);
}

export async function getAnnouncementBarSettingsClient() {
    const cookieStore = cookies();
    return await getAnnouncementBarSettings(cookieStore);
}

export async function updateAnnouncementBarSettingsAction(settings: AnnouncementSettings) {
    const cookieStore = cookies();
    return await updateAnnouncementBarSettings(cookieStore, settings);
}
