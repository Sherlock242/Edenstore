
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
import { updateOrderStatus, type FullOrderDetails } from './actions';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ViewOrdersProps = {
  orders: FullOrderDetails[];
  onStatusUpdated: (orderId: string, newStatus: FullOrderDetails['status']) => void;
};

export function ViewOrders({ orders, onStatusUpdated }: ViewOrdersProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const getStatusInfo = (status: FullOrderDetails['status']) => {
    switch (status) {
      case 'processing': return { text: 'Order Placed', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
      case 'shipped': return { text: 'Shipped', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'delivered': return { text: 'Delivered', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
      default: return { text: status, color: 'bg-muted text-muted-foreground' };
    }
  };

  const calculateOrderTotal = (order: FullOrderDetails) => {
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

  return (
    <Accordion type="multiple" className="w-full space-y-4">
      {orders.map(order => {
        const statusInfo = getStatusInfo(order.status);
        const shippingInfo = JSON.parse(order.shipping_address as string);

        return (
          <AccordionItem value={order.id} key={order.id} className="rounded-lg border bg-card">
            <AccordionTrigger className="p-4 hover:no-underline">
              <div className="flex w-full flex-wrap items-center justify-between gap-4 text-sm">
                <span className="font-medium">#{order.razorpay_order_id.replace('order_', '')}</span>
                <span className="truncate">{order.user.email}</span>
                <span>{format(new Date(order.created_at), 'MMM dd, yyyy')}</span>
                <Badge variant="outline" className={`capitalize ${statusInfo.color}`}>{statusInfo.text}</Badge>
                <span className="font-bold">₹{calculateOrderTotal(order).toFixed(2)}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <h4 className="font-semibold mb-2">Order Items</h4>
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
                                    <TableRow key={item.product.id}>
                                        <TableCell className="flex items-center gap-4">
                                            <Image src={item.product.images[0].url} alt={item.product.name} width={50} height={62} className="rounded-md object-cover"/>
                                            <span>{item.product.name}</span>
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
                     <div>
                        <h4 className="font-semibold mb-2">Customer & Shipping</h4>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p className="font-medium text-foreground">{shippingInfo.firstName} {shippingInfo.lastName}</p>
                            <p>{shippingInfo.address}</p>
                            <p>{shippingInfo.city}, {shippingInfo.country}</p>
                            <p>{shippingInfo.email}</p>
                            <p>{shippingInfo.phone}</p>
                        </div>
                        
                        <div className="mt-4">
                            <h4 className="font-semibold mb-2">Update Status</h4>
                            <Select 
                                defaultValue={order.status} 
                                onValueChange={(value) => handleStatusChange(order.id, value as FullOrderDetails['status'])}
                                disabled={isPending}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Change status..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="processing">Order Placed</SelectItem>
                                    <SelectItem value="shipped">Shipped</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

    