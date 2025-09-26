
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Menu,
  ShoppingBag,
  User,
  PlusCircle,
  LogOut,
  LogIn,
  Trash2,
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
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import md5 from "md5";
import { deleteUserAccount } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "../ui/separator";

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
  const { user, userProfile, loading, logout, isadmin } = useAuth();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

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


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 w-full items-center px-4 sm:px-6 lg:px-8">
        <div className="flex w-full items-center justify-between md:hidden">
          <Link href="/" className="flex items-center space-x-2">
              <span className="font-bold font-headline text-lg uppercase bg-gradient-to-r from-orange-600 to-yellow-400 bg-clip-text text-transparent">
                EDENSTORE
              </span>
          </Link>
          <div className="flex items-center">
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
             <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Toggle navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex flex-col">
                <SheetHeader>
                   <SheetTitle>
                     <Link href="/" className="mb-6 flex items-center space-x-2">
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
                      className={cn("transition-colors hover:text-foreground/80", pathname === link.href ? "text-foreground" : "text-foreground/60")}
                    >
                      {link.label}
                    </Link>
                  ))}
                  {isadmin && (
                   <div className="pt-4 mt-4 border-t">
                    <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Admin</p>
                    {adminLinks.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
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
                            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                            <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
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
                             <Button variant="ghost" className="w-full justify-start" onClick={() => logout()}>
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
                        <Button asChild className="w-full">
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
        </div>

        <div className="hidden flex-1 items-center justify-start md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold font-headline text-lg uppercase bg-gradient-to-r from-orange-600 to-yellow-400 bg-clip-text text-transparent">
              EDENSTORE
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
        
        <div className="hidden flex-1 items-center justify-end md:flex">
            {isadmin && (
              <div className="flex items-center">
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

            <div className="flex items-center space-x-2">
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
                            <DropdownMenuItem onClick={() => logout()}>
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
                    <Button variant="ghost" asChild>
                       <Link href="/login">Login</Link>
                    </Button>
                )}
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

    

    