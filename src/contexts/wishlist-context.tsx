
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
  | { type: "SET_ITEMS"; payload: Product[] }
  | { type: "ADD_ITEM"; payload: Product }
  | { type: "REMOVE_ITEM"; payload: { productId: string } };

const initialState: WishlistState = {
  items: [],
};

const WISHLIST_STORAGE_KEY = "anistore_wishlist";

function wishlistReducer(
  state: WishlistState,
  action: WishlistAction
): WishlistState {
  switch (action.type) {
    case "SET_ITEMS":
      return { ...state, items: action.payload };
    case "ADD_ITEM": {
      const existingItem = state.items.find(
        (item) => item.id === action.payload.id
      );
      if (existingItem) {
        return state; // Already in wishlist
      }
      const newItems = [...state.items, action.payload];
      if (typeof window !== "undefined") {
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(newItems));
      }
      return { ...state, items: newItems };
    }
    case "REMOVE_ITEM": {
      const filteredItems = state.items.filter(
        (item) => item.id !== action.payload.productId
      );
       if (typeof window !== "undefined") {
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(filteredItems));
      }
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
    try {
      const storedWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (storedWishlist) {
        dispatch({ type: "SET_ITEMS", payload: JSON.parse(storedWishlist) });
      }
    } catch (error) {
      console.error("Failed to load wishlist from localStorage", error);
    }
  }, []);

  const isInWishlist = (productId: string) => {
    return state.items.some(item => item.id === productId);
  };
  
  const clientState = isMounted ? state : initialState;
  
  const value = {
    state: clientState,
    dispatch,
    isInWishlist: (productId: string) => isMounted ? isInWishlist(productId) : false,
  };


  return (
    <WishlistContext.Provider value={value}>
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
