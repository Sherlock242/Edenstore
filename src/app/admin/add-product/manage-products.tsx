
// src/app/admin/add-product/manage-products.tsx
'use client';
import { useEffect, useState, useTransition } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { type Product } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Edit, Loader2, Trash2 } from 'lucide-react';
import { deleteProductClient, getProductsClient } from '@/app/server-actions';
import { Badge } from '@/components/ui/badge';


type ManageProductsProps = {
  onEditProduct: (product: Product) => void;
  productAddedOrUpdated: number;
  initialProducts: Product[];
};

export function ManageProducts({ onEditProduct, productAddedOrUpdated, initialProducts }: ManageProductsProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    // This effect re-fetches products when the `productAddedOrUpdated` counter changes.
    // It ensures the list is up-to-date after an add or edit operation.
    getProductsClient().then(setProducts);
  }, [productAddedOrUpdated]);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);


  const handleEditClick = (product: Product) => {
    onEditProduct(product);
  };

  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;

    startTransition(async () => {
        const result = await deleteProductClient(selectedProduct.id);
      if (result.success) {
        setProducts(prevProducts => prevProducts.filter(p => p.id !== selectedProduct.id));
        toast({
          title: 'Success!',
          description: result.message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
      setIsDeleteDialogOpen(false);
      setSelectedProduct(null);
    });
  };

  return (
    <div className="space-y-4">
       <div className="rounded-md border">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Inventory</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {products.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        No products found.
                    </TableCell>
                </TableRow>
            )}
            {products.map(product => {
                const totalStock = product.sizes.reduce((acc, size) => 
                    acc + size.variants.reduce((colorAcc, variant) => colorAcc + variant.quantity, 0)
                , 0);
                const totalColors = new Set(product.sizes.flatMap(s => s.variants.map(v => v.color))).size;
                return (
                    <TableRow key={product.id}>
                    <TableCell>
                        {product.images?.[0]?.url ? (
                            <Image
                                src={product.images[0].url}
                                alt={product.name}
                                width={50}
                                height={62}
                                className="rounded-md object-cover"
                                data-ai-hint={product.images[0].hint}
                            />
                        ): <div className="h-[62.5px] w-[50px] bg-muted rounded-md" />}
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                        <div className="flex flex-col gap-1">
                            <span className="font-semibold">{totalStock} Total</span>
                            <span className="text-xs text-muted-foreground">
                                {product.sizes.length} size{product.sizes.length === 1 ? '' : 's'}, {totalColors} color{totalColors === 1 ? '' : 's'}
                            </span>
                        </div>
                    </TableCell>
                    <TableCell>₹{product.price.toFixed(2)}</TableCell>
                    <TableCell>{product.weight} kg</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(product)} disabled={isPending}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(product)}
                        disabled={isPending}
                        >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Delete</span>
                        </Button>
                    </TableCell>
                    </TableRow>
                )
            })}
            </TableBody>
        </Table>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              product and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isPending}>
              {isPending ? 'Deleting...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
