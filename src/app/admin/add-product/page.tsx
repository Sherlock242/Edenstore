// src/app/admin/add-product/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth-context';
import { AddProductForm } from '@/app/admin/add-product/add-product-form';
import { ManageProducts } from '@/app/admin/add-product/manage-products';

export default function AddProductPage() {
  const { user, loading, isadmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if user is not an admin and data has finished loading
    if (!loading && !isadmin) {
      router.push('/');
    }
  }, [user, loading, isadmin, router]);

  // Render a loading state or nothing while checking for admin status
  if (loading || !isadmin) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12 text-center">
        <p>Loading or unauthorized...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
      <Tabs defaultValue="add">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="add">Add New Product</TabsTrigger>
          <TabsTrigger value="manage">Manage Existing Products</TabsTrigger>
        </TabsList>
        <TabsContent value="add">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Add a New Product</CardTitle>
            </CardHeader>
            <CardContent>
              <AddProductForm />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="manage">
           <Card>
            <CardHeader>
              <CardTitle>Manage Your Products</CardTitle>
            </CardHeader>
            <CardContent>
                <ManageProducts />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
