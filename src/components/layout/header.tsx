
import Link from 'next/link';
import {
  Menu,
  ShoppingBag,
  User,
  LogOut,
  LogIn,
  Trash2,
  Search,
  Heart,
  Package,
  Shield,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import md5 from 'md5';

import { MobileMenuSheet } from './mobile-menu';
import { CartSheet } from '../cart-sheet';
import { SearchSheet } from './search-sheet';

const navLinks = [
  { href: '/products', label: 'T-Shirts' },
  { href: '/track', label: 'Track Order' },
];

const getAvatarFallback = (email: string | null | undefined) => {
    if (!email) return "U";
    return email[0].toUpperCase();
};

const getGravatarUrl = (email: string | null | undefined) => {
    if (!email) return '';
    const hash = md5(email.trim().toLowerCase());
    return `https://www.gravatar.com/avatar/${hash}?d=mp`;
};

type UserProfile = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  display_name: string;
}

export async function Header() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userProfile: UserProfile | null = null;
  let isadmin = false;
  
  if (user) {
      const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
      userProfile = profile as UserProfile | null;
      isadmin = profile?.role === 'admin';
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center px-4">

        {/* Desktop: Left side */}
        <div className="hidden flex-1 items-center justify-start md:flex">
             <Link href="/" className="flex items-center space-x-2">
              <span className="bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text font-headline text-lg font-bold uppercase text-transparent">
                EDENSTORE
              </span>
            </Link>
        </div>

        {/* Mobile: Left side */}
        <div className="flex flex-1 items-center justify-start md:hidden">
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
            <MobileMenuSheet user={user} userProfile={userProfile} isadmin={isadmin} />
          </Sheet>
        </div>

        {/* Center Section (Logo on mobile, nav on desktop) */}
        <div className="flex items-center justify-center">
            <div className="md:hidden">
              <Link href="/" className="flex items-center space-x-2">
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text font-headline text-lg font-bold uppercase text-transparent">
                  EDENSTORE
                </span>
              </Link>
            </div>
             <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
                {navLinks.map(link => (
                <Link
                    key={link.href}
                    href={link.href}
                    className="transition-colors hover:text-foreground/80 text-foreground/60"
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
                  <Button variant="ghost" size="sm" asChild>
                      <Link href="/admin" className="flex items-center gap-1 text-foreground/60">
                          <Shield className="h-4 w-4" />
                          Admin
                      </Link>
                  </Button>
              </div>
            )}

            <div className="flex items-center space-x-0 md:space-x-2">
                <SearchSheet />
                <CartSheet />

                {user ? (
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative hidden h-9 w-9 rounded-full md:flex">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={getGravatarUrl(user.email)} alt={user.email || 'User'} />
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
                             <DropdownMenuItem asChild>
                                <Link href="/my-orders">
                                  <Package className="mr-2 h-4 w-4" />
                                  <span>My Orders</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/wishlist">
                                  <Heart className="mr-2 h-4 w-4" />
                                  <span>Wishlist</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <form action="/auth/signout" method="post">
                              <DropdownMenuItem asChild>
                                <button type="submit" className="w-full">
                                  <LogOut className="mr-2 h-4 w-4" />
                                  <span>Log out</span>
                                </button>
                              </DropdownMenuItem>
                            </form>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem className="text-red-500 focus:bg-red-500/10 focus:text-red-600" asChild>
                                <Link href="/account/delete">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Delete Account</span>
                                </Link>
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
    </header>
  );
}
