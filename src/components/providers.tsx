
"use client";

import { CartProvider } from "@/contexts/cart-context";
import { WishlistProvider } from "@/contexts/wishlist-context";
import React, { type ReactNode, useState, useEffect } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <WishlistProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </WishlistProvider>
  );
}
