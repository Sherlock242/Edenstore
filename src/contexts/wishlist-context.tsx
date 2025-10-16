"use client";

import type { Product } from "@/app/actions";
import React, {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  useState,
  useEffect,
} from "react";

type WishlistState = {
  items: Product[];
};

type WishlistAction =
  | { type: "ADD_ITEM"; payload: Product }
  | { type: "REMOVE_ITEM"; payload: { productId: string } };

const initialState: WishlistState = {
  items: [],
};

function wishlistReducer(
  state: WishlistState,
  action: WishlistAction
): WishlistState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existingItem = state.items.find(
        (item) => item.id === action.payload.id
      );
      if (existingItem) {
        return state; // Already in wishlist
      }
      return { ...state, items: [...state.items, action.payload] };
    }
    case "REMOVE_ITEM": {
      const filteredItems = state.items.filter(
        (item) => item.id !== action.payload.productId
      );
      return { ...state, items: filteredItems };
    }
    default:
      return state;
  }
}

type WishlistContextType = {
  state: WishlistState;
  dispatch: React.Dispatch<WishlistAction>;
  isInWishlist: (productId: string) => boolean;
};

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined
);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wishlistReducer, initialState);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const isInWishlist = (productId: string) => {
    return state.items.some(item => item.id === productId);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <WishlistContext.Provider value={{ state, dispatch, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
