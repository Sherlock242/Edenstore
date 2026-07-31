'use client';
import { useState, useTransition } from 'react';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { updateOrderStatus, deleteOrder, type FullOrderDetails } from './actions';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
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


type ViewOrdersProps = {
  orders: FullOrderDetails[];
  onStatusUpdated: (orderId: string, newStatus: FullOrderDetails['status'], updatedOrder?: FullOrderDetails) => void;
  onOrderDeleted: (orderId: string) => void;
};

export function ViewOrders({ orders, onStatusUpdated, onOrderDeleted }: ViewOrdersProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [orderToDelete, setOrderToDelete] = useState<FullOrderDetails | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const getStatusInfo = (status: FullOrderDetails['status']) => {
    switch (status) {
      case 'pending-shipment': return { text: 'Pending Shipment', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
      case 'processing': return { text: 'Processing', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
      case 'shipped': return { text: 'Shipped', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'delivered': return { text: 'Delivered', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
      default: return { text: status, color: 'bg-muted text-muted-foreground' };
    }
  };

  const calculateSubtotal = (order: FullOrderDetails) => {
    return order.items.reduce((total, item) => total + item.price_at_purchase * item.quantity, 0);
  };
  
  const handleStatusChange = (orderId: string, newStatus: FullOrderDetails['status']) => {
      startTransition(async () => {
          const result = await updateOrderStatus(orderId, newStatus);
          if (result.success) {
              onStatusUpdated(orderId, newStatus);
              toast({ title: "Status Updated", description: `Order status changed to ${newStatus}.`});
          } else {
              toast({ variant: 'destructive', title: "Error", description: result.message });
          }
      });
  }

  const handleDeleteClick = (order: FullOrderDetails) => {
    setOrderToDelete(order);
    setIsDeleteDialogOpen(true);
  }

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    
    startTransition(async () => {
        const result = await deleteOrder(orderToDelete.id);
        if (result.success) {
            onOrderDeleted(orderToDelete.id);
            toast({ title: "Success", description: "Order deleted from database." });
        } else {
            toast({ variant: 'destructive', title: "Error", description: result.message });
        }
        setIsDeleteDialogOpen(false);
        setOrderToDelete(null);
    });
  }

  return (
    <>
    <Accordion type="multiple" className="w-full space-y-4">
      {orders.map(order => {
        const statusInfo = getStatusInfo(order.status);
        const shippingInfo = JSON.parse(order.shipping_address as string);
        const subtotal = calculateSubtotal(order);

        return (
          <AccordionItem value={order.id} key={order.id} className="rounded-lg border bg-card">
            <AccordionTrigger className="p-4 hover:no-underline">
              <div className="flex w-full flex-col items-start gap-2 text-left text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="font-medium">#{order.razorpay_order_id.replace('order_', '').replace('cod_', 'COD-')}</span>
                <span className="truncate sm:w-1/4">{order.user.email}</span>
                <span className="hidden sm:inline">{format(new Date(order.created_at), 'MMM dd, yyyy')}</span>
                <Badge variant="outline" className={cn(order.payment_method === 'COD' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30')}>{order.payment_method || 'Prepaid'}</Badge>
                <Badge variant="outline" className={`capitalize ${statusInfo.color}`}>{statusInfo.text}</Badge>
                <span className="font-bold">₹{order.total_amount.toFixed(2)}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <h4 className="font-semibold mb-2">Order Items</h4>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Details</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {order.items.map(item => (
                                        <TableRow key={`${item.product.id}-${item.size}`}>
                                            <TableCell className="flex items-center gap-4 min-w-[200px]">
                                                {item.product.images && item.product.images.length > 0 ? (
                                                    <Image src={item.product.images[0].url} alt={item.product.name} width={50} height={62} className="rounded-md object-cover"/>
                                                ) : (
                                                    <div className="w-[50px] h-[62px] bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">No Img</div>
                                                )}
                                                <span className="font-medium">{item.product.name}</span>
                                            </TableCell>
                                            <TableCell>
                                                {item.quantity} x ₹{item.price_at_purchase.toFixed(2)}
                                                <br />
                                                <span className="text-xs text-muted-foreground">{item.size} / {item.color}</span>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">₹{(item.price_at_purchase * item.quantity).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                         <Separator className="my-4" />
                        <div className="space-y-2 text-right">
                             <p className="text-sm">Subtotal: <span className="font-medium">₹{subtotal.toFixed(2)}</span></p>
                            {order.discount_amount && order.discount_amount > 0 && (
                                <p className="text-sm text-green-500">Discount ({order.coupon_code}): <span className="font-medium">-₹{order.discount_amount.toFixed(2)}</span></p>
                            )}
                            <p className="text-sm">Shipping: <span className="font-medium">₹{(order.total_amount - subtotal + (order.discount_amount || 0)).toFixed(2)}</span></p>
                            <p className="text-base font-bold">Grand Total: <span className="text-lg">₹{order.total_amount.toFixed(2)}</span></p>
                        </div>
                    </div>
                     <div className="flex flex-col justify-between">
                        <div>
                          <h4 className="font-semibold mb-2">Customer & Shipping</h4>
                          <div className="space-y-2 text-sm text-muted-foreground">
                              <p className="font-medium text-foreground">{shippingInfo.firstName} {shippingInfo.lastName}</p>
                              <p>{shippingInfo.address}</p>
                              <p>{shippingInfo.city}, {shippingInfo.state}, {shippingInfo.pincode}</p>
                              <p>{shippingInfo.country}</p>
                              <p>{shippingInfo.email}</p>
                              <p>{shippingInfo.phone}</p>
                          </div>
                          
                          <div className="mt-6">
                              <h4 className="font-semibold mb-2">Manage Order</h4>
                              <div className="space-y-4">
                                  <div className="space-y-2">
                                      <p className="text-xs text-muted-foreground">Shipment ID: {order.shipment_id || 'N/A'}</p>
                                      <p className="text-xs text-muted-foreground">AWB Code: {order.awb_code || 'Not Generated'}</p>
                                      <Select 
                                          defaultValue={order.status}
                                          value={order.status}
                                          onValueChange={(value) => handleStatusChange(order.id, value as FullOrderDetails['status'])}
                                          disabled={isPending}
                                      >
                                          <SelectTrigger>
                                              <SelectValue placeholder="Change status..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="pending-shipment" disabled>Pending Shipment</SelectItem>
                                              <SelectItem value="processing">Processing</SelectItem>
                                              <SelectItem value="shipped">Shipped</SelectItem>
                                              <SelectItem value="delivered">Delivered</SelectItem>
                                          </SelectContent>
                                      </Select>
                                  </div>
                              </div>
                          </div>
                        </div>

                        <div className="mt-8 border-t pt-4">
                           <Button 
                              variant="destructive" 
                              className="w-full" 
                              onClick={() => handleDeleteClick(order)}
                              disabled={isPending}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Order
                            </Button>
                        </div>
                    </div>
                </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>

    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete order <strong>#{orderToDelete?.razorpay_order_id.replace('order_', '').replace('cod_', 'COD-')}</strong> from your database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Deleting...' : 'Yes, Delete Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
