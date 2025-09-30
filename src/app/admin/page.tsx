// src/app/admin/page.tsx
'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { PlusCircle, Package, Users, Settings, ArrowRight } from 'lucide-react';

const adminLinks = [
    { href: "/admin/add-product", label: "Manage Products", description: "Add, edit, and remove products.", icon: PlusCircle },
    { href: "/admin/orders", label: "Customer Orders", description: "View and manage all incoming orders.", icon: Package },
    { href: "/admin/users", label: "Manage Users", description: "View and manage registered users.", icon: Users },
    { href: "/admin/settings", label: "Site Settings", description: "Manage global site settings.", icon: Settings },
];

export default function AdminDashboardPage() {
  const { user, loading, isadmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isadmin) {
      router.push('/');
    }
  }, [user, loading, isadmin, router]);


  if (loading || !isadmin) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12 text-center">
        <p>Loading or unauthorized...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
        <div className="mb-8">
            <h1 className="font-headline text-3xl font-bold tracking-tighter md:text-4xl">Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {user?.email}.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminLinks.map((link) => (
                <Link href={link.href} key={link.href} className="group">
                    <Card className="h-full hover:border-primary transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-3">
                                    <link.icon className="h-6 w-6 text-primary" />
                                    {link.label}
                                </CardTitle>
                                <CardDescription>{link.description}</CardDescription>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                        </CardHeader>
                    </Card>
                </Link>
            ))}
        </div>
    </div>
  );
}