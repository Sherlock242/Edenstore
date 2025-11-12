
"use client";

import { CartProvider } from "@/contexts/cart-context";
import { WishlistProvider } from "@/contexts/wishlist-context";
import React, { type ReactNode } from 'react';


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
