
"use server";
import { products } from "@/lib/product-data";
import type { Product } from "@/lib/product-data";

export async function getProducts() {
    return Promise.resolve(products);
}
