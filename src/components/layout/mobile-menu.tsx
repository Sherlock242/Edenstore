
'use client';
import Link from 'next/link';
import {
  LogOut,
  LogIn,
  Trash2,
  Heart,
  Package,
  Shield,
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import md5 from 'md5';

type UserProfile = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  display_name: string;
}

type MobileMenuSheetProps = {
  user: User | null;
  userProfile: UserProfile | null;
  isadmin: boolean;
  setOpen: (open: boolean) => void;
};

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
}


export function MobileMenuSheet({ user, userProfile, isadmin, setOpen }: MobileMenuSheetProps) {
  return (
    <SheetContent side="left" className="flex flex-col">
      <SheetHeader>
        <SheetTitle>
          <Link href="/" onClick={() => setOpen(false)} className="mb-6 flex items-center space-x-2">
            <span className="bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text font-headline text-lg font-bold uppercase text-transparent">
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
            onClick={() => setOpen(false)}
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            {link.label}
          </Link>
        ))}
        <Link href="/wishlist" onClick={() => setOpen(false)} className="transition-colors hover:text-foreground/80 text-foreground/60">Wishlist</Link>
        <Link href="/my-orders" onClick={() => setOpen(false)} className="transition-colors hover:text-foreground/80 text-foreground/60">My Orders</Link>
        {isadmin && (
          <div className="pt-4 mt-4 border-t">
            <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 text-foreground/60 transition-colors hover:text-foreground/80 py-2"
            >
                <Shield className="h-4 w-4" />
                Admin
            </Link>
          </div>
        )}
      </nav>
      <SheetFooter className="mt-auto border-t pt-6">
        {user ? (
          <div className="flex w-full flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={getGravatarUrl(user.email)} alt={user.email || 'User'} />
                <AvatarFallback>{getAvatarFallback(user.email)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userProfile?.display_name || user.email}</p>
                {userProfile?.display_name && <p className="text-xs leading-none text-muted-foreground">{user.email}</p>}
              </div>
            </div>
            <Separator />
            <form action="/auth/signout" method="post" className="w-full">
              <Button variant="ghost" className="w-full justify-start" type="submit">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </Button>
            </form>
            <Button
              asChild
              variant="ghost"
              className="w-full justify-start text-red-500 hover:bg-red-500/10 hover:text-red-600"
              onClick={() => setOpen(false)}
            >
              <Link href="/account/delete">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete Account</span>
              </Link>
            </Button>
          </div>
        ) : (
          <Button asChild className="w-full bg-gradient-to-r from-orange-600 to-yellow-500 text-white" onClick={() => setOpen(false)}>
            <Link href="/login">
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Link>
          </Button>
        )}
      </SheetFooter>
    </SheetContent>
  );
}
