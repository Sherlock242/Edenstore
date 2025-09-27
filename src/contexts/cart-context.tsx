
'use client';

import type { Product } from '@/app/actions';
import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  useEffect,
  useCallback,
} from 'react';
import { useAuth } from './auth-context';
import {
  getCartItems,
  addCartItem,
  updateCartItemQuantity,
  removeCartItem,
} from '@/app/cart/actions';
import { useToast } from '@/hooks/use-toast';

export type CartItem = {
  product: Product;
  quantity: number;
  size: string;
  color: string;
};

type CartState = {
  items: CartItem[];
  loading: boolean;
};

type CartAction =
  | { type: 'SET_ITEMS'; payload: CartItem[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_OR_UPDATE_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { productId: string; size: string; color: string } };

const initialState: CartState = {
  items: [],
  loading: true,
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'SET_ITEMS':
      return { ...state, items: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'ADD_OR_UPDATE_ITEM': {
      const existingItemIndex = state.items.findIndex(
        item =>
          item.product.id === action.payload.product.id &&
          item.size === action.payload.size &&
          item.color === action.payload.color
      );
      const newItems = [...state.items];
      if (existingItemIndex > -1) {
        newItems[existingItemIndex] = action.payload;
      } else {
        newItems.push(action.payload);
      }
      return { ...state, items: newItems };
    }
    case 'REMOVE_ITEM': {
       const filteredItems = state.items.filter(
        (item) =>
          !(
            item.product.id === action.payload.productId &&
            item.size === action.payload.size &&
            item.color === action.payload.color
          )
      );
      return { ...state, items: filteredItems };
    }
    default:
      return state;
  }
}

type CartContextType = {
  state: CartState;
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => Promise<void>;
  updateQuantity: (productId: string, size: string, color: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string, size: string, color: string) => Promise<void>;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const loadCart = useCallback(async () => {
    if (!user) {
      dispatch({ type: 'SET_ITEMS', payload: [] });
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    const result = await getCartItems();
    if (result.success && result.items) {
      dispatch({ type: 'SET_ITEMS', payload: result.items });
    } else {
      dispatch({ type: 'SET_ITEMS', payload: [] });
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadCart();
    }
  }, [user, authLoading, loadCart]);

  const addToCart = async (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to add items to your cart.' });
      return;
    }
    const quantity = item.quantity || 1;
    
    // Find if the item already exists to determine if we should say "added" or "updated"
    const existingItem = state.items.find(
      i =>
        i.product.id === item.product.id &&
        i.size === item.size &&
        i.color === item.color
    );

    const result = await addCartItem({ ...item, quantity });

    if (result.success && result.item) {
      dispatch({ type: 'ADD_OR_UPDATE_ITEM', payload: result.item });
      if (existingItem) {
          toast({ title: 'Cart updated!', description: `Quantity for ${item.product.name} is now ${result.item.quantity}.` });
      } else {
          toast({ title: 'Added to cart!', description: `${item.product.name} is now in your cart.` });
      }
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  const updateQuantity = async (productId: string, size: string, color: string, quantity: number) => {
     if (!user) return;
     if (quantity > 0) {
        const result = await updateCartItemQuantity({ productId, size, color, quantity });
        if (result.success && result.item) {
          dispatch({ type: 'ADD_OR_UPDATE_ITEM', payload: result.item });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: result.message });
        }
     } else {
        await removeFromCart(productId, size, color);
     }
  };

  const removeFromCart = async (productId: string, size: string, color: string) => {
     if (!user) return;
     const result = await removeCartItem({ productId, size, color });
     if (result.success) {
        dispatch({ type: 'REMOVE_ITEM', payload: { productId, size, color } });
        toast({ title: 'Item removed', description: 'The item has been removed from your cart.' });
     } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
     }
  };

  const value = { state, addToCart, updateQuantity, removeFromCart };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
