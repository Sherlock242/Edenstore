// src/app/admin/add-product/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth-context';
import { AddProductForm } from '@/app/admin/add-product/add-product-form';
import { ManageProducts } from '@/app/admin/add-product/manage-products';
import type { Product } from '@/app/actions';

export default function AddProductPage() {
  const { user, loading, isadmin } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('add');
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  useEffect(() => {
    if (!loading && !isadmin) {
      router.push('/');
    }
  }, [user, loading, isadmin, router]);

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    setActiveTab('add'); 
  };
  
  const handleProductAddedOrUpdated = () => {
    setProductToEdit(null);
    // We can optionally switch back to the manage tab after an update
    // setActiveTab('manage');
  }

  if (loading || !isadmin) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12 text-center">
        <p>Loading or unauthorized...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="add">{productToEdit ? 'Edit Product' : 'Add New Product'}</TabsTrigger>
          <TabsTrigger value="manage">Manage Existing Products</TabsTrigger>
        </TabsList>
        <TabsContent value="add">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>{productToEdit ? 'Edit Your Product' : 'Add a New Product'}</CardTitle>
            </CardHeader>
            <CardContent>
              <AddProductForm 
                productToEdit={productToEdit} 
                onProductAddedOrUpdated={handleProductAddedOrUpdated}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="manage">
           <Card>
            <CardHeader>
              <CardTitle>Manage Your Products</CardTitle>
            </CardHeader>
            <CardContent>
                <ManageProducts onEditProduct={handleEditProduct}/>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
