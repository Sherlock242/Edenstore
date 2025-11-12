
"use client";

import type { Product } from "@/app/actions";
import React, {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  useEffect,
  useCallback,
  useState,
} from "react";
import {
  getWishlistItems,
  addWishlistItem,
  removeWishlistItem,
} from "@/app/wishlist/actions";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

type WishlistState = {
  items: Product[];
  loading: boolean;
};

type WishlistAction =
  | { type: "SET_ITEMS"; payload: Product[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "ADD_ITEM"; payload: Product }
  | { type: "REMOVE_ITEM"; payload: { productId: string } };

const initialState: WishlistState = {
  items: [],
  loading: true,
};

function wishlistReducer(
  state: WishlistState,
  action: WishlistAction
): WishlistState {
  switch (action.type) {
    case "SET_ITEMS":
      return { ...state, items: action.payload, loading: false };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "ADD_ITEM": {
      const existingItem = state.items.find(
        (item) => item.id === action.payload.id
      );
      if (existingItem) return state;
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
  const { toast } = useToast();
  const [supabase] = useState(() => createClient());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadWishlist = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      dispatch({ type: "SET_ITEMS", payload: [] });
      return;
    }
    dispatch({ type: "SET_LOADING", payload: true });
    const result = await getWishlistItems();
    if (result.success && result.items) {
      dispatch({ type: "SET_ITEMS", payload: result.items });
    } else {
      dispatch({ type: "SET_ITEMS", payload: [] });
    }
  }, [supabase]);

  useEffect(() => {
    if (!isMounted) return;
    
    loadWishlist();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
        if (['SIGNED_IN', 'SIGNED_OUT', 'USER_DELETED'].includes(event)) {
          loadWishlist();
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [isMounted, loadWishlist, supabase]);


  const isInWishlist = (productId: string) => {
    return state.items.some((item) => item.id === productId);
  };
  
  const handleAddItem = async (product: Product) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ variant: 'destructive', title: 'Please log in', description: 'You need to be logged in to add items to your wishlist.' });
      return;
    }
    // Optimistic update
    dispatch({ type: "ADD_ITEM", payload: product });
    const result = await addWishlistItem(product.id);
    if (result.success) {
      toast({ title: 'Added to Wishlist', description: `${product.name} has been added to your wishlist.` });
    } else {
      // Revert on failure
      dispatch({ type: 'REMOVE_ITEM', payload: { productId: product.id } });
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };
  
  const handleRemoveItem = async (productId: string) => {
    const itemToRemove = state.items.find(i => i.id === productId);
    if (!itemToRemove) return;

    // Optimistic update
    dispatch({ type: "REMOVE_ITEM", payload: { productId } });
    const result = await removeWishlistItem(productId);
    if (result.success) {
      toast({ title: 'Removed from Wishlist', description: `The item has been removed from your wishlist.` });
    } else {
      // Revert on failure
      dispatch({ type: 'ADD_ITEM', payload: itemToRemove });
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  const value = {
    state: isMounted ? state : initialState,
    dispatch: (action: WishlistAction) => {
        switch(action.type) {
            case 'ADD_ITEM':
                handleAddItem(action.payload);
                break;
            case 'REMOVE_ITEM':
                handleRemoveItem(action.payload.productId);
                break;
            default:
                dispatch(action);
        }
    },
    isInWishlist: (productId: string) => isMounted && isInWishlist(productId),
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
