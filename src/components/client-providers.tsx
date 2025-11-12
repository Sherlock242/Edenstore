"use client";

import { CartProvider } from "@/contexts/cart-context";
import { WishlistProvider } from "@/contexts/wishlist-context";
import React, { type ReactNode } from 'react';

// By creating separate wrapper components, we ensure that each provider and its children
// are correctly handled as client components by Next.js, preventing server-rendering errors.

function WishlistWrapper({ children }: { children: ReactNode }) {
  return <WishlistProvider>{children}</WishlistProvider>;
}

function CartWrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <WishlistWrapper>
      <CartWrapper>
        {children}
      </CartWrapper>
    </WishlistWrapper>
  );
}
