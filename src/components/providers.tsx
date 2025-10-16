"use client";

import { CartProvider } from "@/contexts/cart-context";
import { WishlistProvider } from "@/contexts/wishlist-context";
import type { ReactNode } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <WishlistProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </WishlistProvider>
  );
}
