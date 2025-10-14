'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddProductForm } from '@/app/admin/add-product/add-product-form';
import { ManageProducts } from '@/app/admin/add-product/manage-products';
import { type Product } from '@/app/actions';
import { getProductsClient } from '@/app/server-actions';
import { Loader2 } from 'lucide-react';

// This is now a client component to manage state, but it fetches initial data on the server.
export default function AddProductPage() {
  const [activeTab, setActiveTab] = useState('add');
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productAddedOrUpdated, setProductAddedOrUpdated] = useState(0);

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    setActiveTab('add'); 
  };
  
  const handleProductAddedOrUpdated = () => {
    setProductToEdit(null);
    setProductAddedOrUpdated(c => c + 1);
    // Potentially switch tab after update
    setActiveTab('manage');
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
      <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          // If user switches away from edit tab, clear the product to edit
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
                <ManageProductsWrapper 
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


// Wrapper component to fetch initial data on the client
function ManageProductsWrapper({ onEditProduct, productAddedOrUpdated }: { onEditProduct: (product: Product) => void; productAddedOrUpdated: number; }) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getProductsClient().then(products => {
            setProducts(products)
            setLoading(false);
        });
    }, [productAddedOrUpdated]);

    if (loading) {
        return <div className="text-center flex items-center justify-center min-h-[200px]"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }
    
    return <ManageProducts initialProducts={products} onEditProduct={onEditProduct} productAddedOrUpdated={productAddedOrUpdated} />;
}
