
"use client";

import Link from "next/link";
import {
  Heart,
  Menu,
  Search,
  ShoppingBag,
  Shirt,
  User,
  PlusCircle,
  LogOut,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCart } from "@/contexts/cart-context";
import { useAuth } from "@/contexts/auth-context";
import { CartSheetContent } from "../cart-sheet";
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/products", label: "T-Shirts" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/track", label: "Track Order" },
];

const adminLinks = [
    { href: "/admin/add-product", label: "Add Product", icon: PlusCircle },
]

export function Header() {
  const { state: cartState } = useCart();
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const cartItemCount = cartState.items.reduce((acc, item) => acc + item.quantity, 0);
  
  const getAvatarFallback = (email: string | null | undefined) => {
    if (!email) return "U";
    return email[0].toUpperCase();
  };


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Shirt className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline text-lg text-primary">
              EdenStore
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn("transition-colors hover:text-foreground/80", pathname === link.href ? "text-foreground" : "text-foreground/60")}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <Link href="/" className="mb-6 flex items-center space-x-2">
              <Shirt className="h-6 w-6 text-primary" />
              <span className="font-bold font-headline text-lg text-primary">
                EdenStore
              </span>
            </Link>
            <nav className="flex flex-col space-y-4">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn("transition-colors hover:text-foreground/80", pathname === link.href ? "text-foreground" : "text-foreground/60")}
                >
                  {link.label}
                </Link>
              ))}
               <div className="pt-4 mt-4 border-t">
                {adminLinks.map(link => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-2 text-foreground/60 transition-colors hover:text-foreground/80"
                    >
                        <link.icon className="h-4 w-4" />
                        {link.label}
                    </Link>
                ))}
                </div>
            </nav>
          </SheetContent>
        </Sheet>
        
        <div className="flex flex-1 items-center justify-end md:justify-between">
            <div className="flex-1 md:flex md:justify-center">
                 <Link href="/" className="flex items-center space-x-2 md:hidden">
                    <Shirt className="h-6 w-6 text-primary" />
                    <span className="font-bold font-headline text-lg text-primary">
                    EdenStore
                    </span>
                </Link>
            </div>
          
            <div className="flex items-center justify-end space-x-2">
            <form className="hidden w-full max-w-sm items-center md:flex">
                <Input type="search" placeholder="Search shirts..." className="h-9" />
                <Button variant="ghost" size="icon" type="submit" aria-label="Search">
                <Search className="h-4 w-4" />
                </Button>
            </form>
            
            <div className="hidden md:flex items-center">
                {adminLinks.map(link => (
                    <Button variant="ghost" size="sm" asChild key={link.href}>
                        <Link href={link.href} className="flex items-center gap-1">
                            <link.icon className="h-4 w-4" />
                            {link.label}
                        </Link>
                    </Button>
                ))}
            </div>

            <Button variant="ghost" size="icon" asChild>
                <Link href="/wishlist">
                <Heart className="h-5 w-5" />
                <span className="sr-only">Wishlist</span>
                </Link>
            </Button>

            <Sheet>
                <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <ShoppingBag className="h-5 w-5" />
                    {cartItemCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {cartItemCount}
                    </span>
                    )}
                    <span className="sr-only">Shopping Cart</span>
                </Button>
                </SheetTrigger>
                <CartSheetContent />
            </Sheet>

            {loading ? (
                <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
            ) : user ? (
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={user.user_metadata?.avatar_url || ''} alt={user.email || 'User'} />
                                <AvatarFallback>{getAvatarFallback(user.email)}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user.user_metadata?.name || user.email}</p>
                                {user.user_metadata?.name && <p className="text-xs leading-none text-muted-foreground">{user.email}</p>}
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => logout()}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <Button variant="ghost" asChild>
                   <Link href="/login">Login</Link>
                </Button>
            )}
            </div>
        </div>
      </div>
    </header>
  );
}
