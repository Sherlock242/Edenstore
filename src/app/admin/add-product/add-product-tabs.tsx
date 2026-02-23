
'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type Product } from '@/app/actions';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import components
const AddProductForm = dynamic(() => import('@/app/admin/add-product/add-product-form').then(mod => mod.AddProductForm), {
  loading: () => <AddProductFormSkeleton />,
});
const ManageProducts = dynamic(() => import('@/app/admin/add-product/manage-products').then(mod => mod.ManageProducts), {
  loading: () => <ManageProductsSkeleton />,
});

type AddProductTabsProps = {
  initialProducts: Product[];
}

export function AddProductTabs({ initialProducts }: AddProductTabsProps) {
  const [activeTab, setActiveTab] = useState('add');
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  // This state is used to trigger a re-fetch in the manage products component
  const [productAddedOrUpdated, setProductAddedOrUpdated] = useState(0);

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    setActiveTab('add'); 
  };
  
  const handleProductAddedOrUpdated = () => {
    setProductToEdit(null);
    setProductAddedOrUpdated(c => c + 1);
    setActiveTab('manage');
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
      <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          if (value !== 'add') {
              setProductToEdit(null);
          }
      }}>
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="add">{productToEdit ? 'Edit Product' : 'Add New Product'}</TabsTrigger>
          <TabsTrigger value="manage">Manage Products</TabsTrigger>
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
                <ManageProducts
                    initialProducts={initialProducts}
                    onEditProduct={handleEditProduct}
                    productAddedOrUpdated={productAddedOrUpdated}
                />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Loading Skeleton Components
function AddProductFormSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
       <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-12 w-32" />
    </div>
  )
}

function ManageProductsSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="w-full">
        <div className="p-4 border-b">
          <Skeleton className="h-5 w-full" />
        </div>
        <div className="p-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12" />
              <Skeleton className="h-5 flex-grow" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
