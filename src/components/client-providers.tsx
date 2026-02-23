"use client";

import { CartProvider } from "@/contexts/cart-context";
import { WishlistProvider } from "@/contexts/wishlist-context";
import React, { type ReactNode } from 'react';
import { UserProvider } from "@/hooks/use-user.tsx";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <WishlistProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </WishlistProvider>
    </UserProvider>
  );
}
