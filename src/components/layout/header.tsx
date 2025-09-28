
"use client";

import Link from "next/link";
import { useState, useTransition, useEffect, useRef } from "react";
import {
  Menu,
  ShoppingBag,
  User,
  PlusCircle,
  LogOut,
  LogIn,
  Trash2,
  Search,
  X,
  Heart,
  Package,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCart } from "@/contexts/cart-context";
import { useAuth } from "@/contexts/auth-context";
import { CartSheetContent } from "../cart-sheet";
import { usePathname, useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import md5 from "md5";
import { deleteUserAccount } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "../ui/separator";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/products", label: "T-Shirts" },
  { href: "/track", label: "Track Order" },
];

const adminLinks = [
    { href: "/admin/add-product", label: "Manage Products", icon: PlusCircle },
    { href: "/admin/orders", label: "Customer Orders", icon: Users },
]

export function Header() {
  const { state: cartState } = useCart();
  const { user, userProfile, loading, isadmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const cartItemCount = cartState.items.reduce((acc, item) => acc + item.quantity, 0);
  
  const getAvatarFallback = (email: string | null | undefined) => {
    if (!email) return "U";
    return email[0].toUpperCase();
  };

  const getGravatarUrl = (email: string | null | undefined) => {
    if (!email) return '';
    const hash = md5(email.trim().toLowerCase());
    return `https://www.gravatar.com/avatar/${hash}?d=mp`;
  }
  
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleDeleteAccount = async () => {
    startTransition(async () => {
      const result = await deleteUserAccount();
      if (result.success) {
        toast({
          title: "Account Deleted",
          description: "Your account has been permanently deleted.",
        });
        // The onAuthStateChange listener in AuthProvider will handle the redirect/UI update.
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Could not delete your account.",
        });
      }
      setIsDeleteAlertOpen(false);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
          router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
          setIsSearchOpen(false);
          setSearchQuery('');
      }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        // Check if the click was on the search trigger button itself
        const searchTrigger = document.querySelector('[data-search-trigger]');
        if (searchTrigger && !searchTrigger.contains(event.target as Node)) {
          setIsSearchOpen(false);
        }
      }
    };

    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchOpen]);


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center px-4">

        {/* Desktop: Left side */}
        <div className="hidden flex-1 items-center justify-start md:flex">
             <Link href="/" className="flex items-center space-x-2">
              <span className="font-bold font-headline text-lg uppercase bg-gradient-to-r from-orange-600 to-yellow-400 bg-clip-text text-transparent">
                EDENSTORE
              </span>
            </Link>
        </div>

        {/* Mobile: Left side */}
        <div className="flex flex-1 items-center justify-start md:hidden">
           <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Toggle navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <SheetHeader>
                  <SheetTitle>
                    <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="mb-6 flex items-center space-x-2">
                      <span className="font-bold font-headline text-lg uppercase bg-gradient-to-r from-orange-600 to-yellow-400 bg-clip-text text-transparent">
                        EDENSTORE
                      </span>
                    </Link>
                  </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col space-y-4 mt-6">
                {navLinks.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn("transition-colors hover:text-foreground/80", pathname === link.href ? "text-foreground" : "text-foreground/60")}
                  >
                    {link.label}
                  </Link>
                ))}
                  <Link href="/wishlist" onClick={() => setIsMobileMenuOpen(false)} className="transition-colors hover:text-foreground/80 text-foreground/60">Wishlist</Link>
                  <Link href="/my-orders" onClick={() => setIsMobileMenuOpen(false)} className="transition-colors hover:text-foreground/80 text-foreground/60">My Orders</Link>
                {isadmin && (
                  <div className="pt-4 mt-4 border-t">
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Admin</p>
                  {adminLinks.map(link => (
                      <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-2 text-foreground/60 transition-colors hover:text-foreground/80 py-2"
                      >
                          <link.icon className="h-4 w-4" />
                          {link.label}
                      </Link>
                  ))}
                  </div>
                  )}
              </nav>
              <SheetFooter className="mt-auto border-t pt-6">
                    {loading ? (
                      <div className="flex items-center gap-2">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <Skeleton className="h-4 w-24 rounded-md" />
                      </div>
                  ) : user ? (
                      <div className="flex w-full flex-col gap-4">
                          <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={user.user_metadata?.avatar_url || getGravatarUrl(user.email)} alt={user.email || 'User'} />
                                  <AvatarFallback>{getAvatarFallback(user.email)}</AvatarFallback>
                              </Avatar>
                                <div className="flex flex-col space-y-1">
                                  <p className="text-sm font-medium leading-none">{userProfile?.display_name || user.email}</p>
                                  {userProfile?.display_name && <p className="text-xs leading-none text-muted-foreground">{user.email}</p>}
                              </div>
                          </div>
                          <Separator />
                            <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </Button>
                          <Button
                              variant="ghost"
                              className="w-full justify-start text-red-500 hover:bg-red-500/10 hover:text-red-600"
                              onClick={() => setIsDeleteAlertOpen(true)}
                          >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete Account</span>
                          </Button>
                      </div>
                  ) : (
                      <Button asChild className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                          <Link href="/login">
                            <LogIn className="mr-2 h-4 w-4"/>
                            Login
                          </Link>
                      </Button>
                  )}
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>


        {/* Center Section (Logo on mobile, nav on desktop) */}
        <div className="flex items-center justify-center">
            <div className="md:hidden">
              <Link href="/" className="flex items-center space-x-2">
                <span className="font-bold font-headline text-lg uppercase bg-gradient-to-r from-orange-600 to-yellow-400 bg-clip-text text-transparent">
                  EDENSTORE
                </span>
              </Link>
            </div>
             <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
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


        {/* Right Section (Icons) */}
        <div className="flex flex-1 items-center justify-end gap-2 md:gap-4">
            {isadmin && (
              <div className="hidden items-center md:flex">
                  {adminLinks.map(link => (
                      <Button variant="ghost" size="sm" asChild key={link.href}>
                          <Link href={link.href} className="flex items-center gap-1">
                              <link.icon className="h-4 w-4" />
                              {link.label}
                          </Link>
                      </Button>
                  ))}
              </div>
            )}

            <div className="flex items-center space-x-0 md:space-x-2">
                <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(!isSearchOpen)} data-search-trigger>
                  <Search className="h-5 w-5" />
                  <span className="sr-only">Search</span>
                </Button>
                <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
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
                    <CartSheetContent setSheetOpen={setIsCartOpen} />
                </Sheet>

                {loading ? (
                    <Skeleton className="hidden h-9 w-9 rounded-full md:block" />
                ) : user ? (
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative hidden h-9 w-9 rounded-full md:flex">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={user.user_metadata?.avatar_url || getGravatarUrl(user.email)} alt={user.email || 'User'} />
                                    <AvatarFallback>{getAvatarFallback(user.email)}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{userProfile?.display_name || user.email}</p>
                                    {userProfile?.display_name && <p className="text-xs leading-none text-muted-foreground">{user.email}</p>}
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem onClick={() => router.push('/my-orders')}>
                                <Package className="mr-2 h-4 w-4" />
                                <span>My Orders</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push('/wishlist')}>
                                <Heart className="mr-2 h-4 w-4" />
                                <span>Wishlist</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-red-500 focus:bg-red-500/10 focus:text-red-600"
                                onClick={() => setIsDeleteAlertOpen(true)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete Account</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <Button variant="ghost" asChild className="hidden md:flex">
                       <Link href="/login">Login</Link>
                    </Button>
                )}
            </div>
        </div>
      </div>
      <div
        ref={searchRef}
        className={cn(
          "absolute top-full left-0 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden",
          isSearchOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-4 border-b">
          <div className="container mx-auto max-w-7xl">
            <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Search for products..." 
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setIsSearchOpen(false)}>
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close search</span>
                </Button>
                </div>
            </form>
          </div>
        </div>
      </div>
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteAccount}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Yes, delete my account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
