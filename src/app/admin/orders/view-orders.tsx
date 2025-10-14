
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
import { updateOrderStatus, schedulePickupForOrder, type FullOrderDetails, sendOrderToShiprocket } from './actions';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarIcon, Rocket, Send } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';


type ViewOrdersProps = {
  orders: FullOrderDetails[];
  onStatusUpdated: (orderId: string, newStatus: FullOrderDetails['status'], updatedOrder?: FullOrderDetails) => void;
};

export function ViewOrders({ orders, onStatusUpdated }: ViewOrdersProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const [orderIdToSchedule, setOrderIdToSchedule] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [pickupDate, setPickupDate] = useState<Date | undefined>();
  const [isPushing, setIsPushing] = useState<string | null>(null);


  const getStatusInfo = (status: FullOrderDetails['status']) => {
    switch (status) {
      case 'processing': return { text: 'Processing', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
      case 'pickup-scheduled': return { text: 'Pickup Scheduled', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
      case 'shipped': return { text: 'Shipped', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'delivered': return { text: 'Delivered', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
      default: return { text: status, color: 'bg-muted text-muted-foreground' };
    }
  };

  const calculateOrderTotal = (order: FullOrderDetails) => {
    return order.items.reduce((total, item) => total + item.price_at_purchase * item.quantity, 0);
  };
  
  const handleStatusChange = (order: FullOrderDetails, newStatus: FullOrderDetails['status']) => {
      if (newStatus === 'pickup-scheduled' && order.status === 'processing' && order.shipment_id) {
          setOrderIdToSchedule(order.id);
          // Don't update the status immediately, wait for schedule confirmation
      } else {
          setOrderIdToSchedule(null); // Hide scheduling UI if another status is selected
          startTransition(async () => {
              const result = await updateOrderStatus(order.id, newStatus);
              if (result.success) {
                  onStatusUpdated(order.id, newStatus);
                  toast({ title: "Status Updated", description: `Order status changed to ${newStatus}.`});
              } else {
                  toast({ variant: 'destructive', title: "Error", description: result.message });
              }
          });
      }
  }

  const handleConfirmSchedule = (order: FullOrderDetails, dateToUse?: Date) => {
      if (!order) return;
      
      if (!dateToUse) {
         // This condition is for manual date selection
          const isManual = pickupDate !== undefined;
          if (isManual && !pickupDate) {
            toast({ variant: 'destructive', title: 'No Date Selected', description: 'Please select a pickup date.' });
            return;
          }
      }

      setIsScheduling(true);
      startTransition(async () => {
          const result = await schedulePickupForOrder(order, dateToUse || pickupDate);
          if (result.success) {
              onStatusUpdated(order.id, 'pickup-scheduled');
              toast({ title: "Pickup Scheduled!", description: result.message });
          } else {
              toast({ variant: 'destructive', title: "Scheduling Failed", description: result.message });
          }
          setOrderIdToSchedule(null);
          setPickupDate(undefined);
          setIsScheduling(false);
      });
  }

  const handlePushToShiprocket = (order: FullOrderDetails) => {
      setIsPushing(order.id);
      startTransition(async () => {
        const result = await sendOrderToShiprocket(order);
        if (result.success) {
            toast({ title: 'Order Pushed!', description: result.message });
            // Manually update the client-side order with new shipment IDs
            const updatedOrder = { ...order, shipment_id: result.shipmentId!, shiprocket_order_id: result.shipmentId! };
            onStatusUpdated(order.id, order.status, updatedOrder); 
        } else {
            toast({ variant: 'destructive', title: "Push Failed", description: result.message });
        }
        setIsPushing(null);
      });
  }

  return (
    <Accordion type="multiple" className="w-full space-y-4">
      {orders.map(order => {
        const statusInfo = getStatusInfo(order.status);
        const shippingInfo = JSON.parse(order.shipping_address as string);
        const isSchedulingThis = order.id === orderIdToSchedule;

        return (
          <AccordionItem value={order.id} key={order.id} className="rounded-lg border bg-card">
            <AccordionTrigger className="p-4 hover:no-underline">
              <div className="flex w-full flex-col items-start gap-2 text-left text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="font-medium">#{order.razorpay_order_id.replace('order_', '').replace('cod_', 'COD-')}</span>
                <span className="truncate sm:w-1/4">{order.user.email}</span>
                <span className="hidden sm:inline">{format(new Date(order.created_at), 'MMM dd, yyyy')}</span>
                <Badge variant="outline" className={cn(order.payment_method === 'COD' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30')}>{order.payment_method || 'Prepaid'}</Badge>
                <Badge variant="outline" className={`capitalize ${statusInfo.color}`}>{statusInfo.text}</Badge>
                <span className="font-bold">₹{calculateOrderTotal(order).toFixed(2)}</span>
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
                            <h4 className="font-semibold mb-2">Manage Order</h4>
                            {!order.shipment_id && !order.shiprocket_order_id ? (
                                <Button className="w-full" onClick={() => handlePushToShiprocket(order)} disabled={isPushing === order.id}>
                                    <Send className="mr-2 h-4 w-4" />
                                    {isPushing === order.id ? 'Pushing...' : 'Push to Shiprocket'}
                                </Button>
                            ) : (
                                <div className="space-y-2">
                                    <Select 
                                        defaultValue={order.status} 
                                        value={isSchedulingThis ? 'pickup-scheduled' : order.status}
                                        onValueChange={(value) => handleStatusChange(order, value as FullOrderDetails['status'])}
                                        disabled={isPending || isScheduling}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Change status..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="processing">Processing</SelectItem>
                                            <SelectItem value="pickup-scheduled" disabled={!order.shipment_id || order.status !== 'processing'}>
                                                Schedule Pickup
                                            </SelectItem>
                                            <SelectItem value="shipped">Shipped</SelectItem>
                                            <SelectItem value="delivered">Delivered</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {isSchedulingThis && (
                                        <div className="grid gap-2 pt-2 border-t mt-2">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !pickupDate && "text-muted-foreground"
                                                    )}
                                                    disabled={isScheduling}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {pickupDate ? format(pickupDate, "PPP") : <span>Pick a manual date</span>}
                                                </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={pickupDate}
                                                    onSelect={setPickupDate}
                                                    initialFocus
                                                    disabled={(date) => date < new Date() || isScheduling}
                                                />
                                                </PopoverContent>
                                            </Popover>
                                            <Button onClick={() => handleConfirmSchedule(order, pickupDate)} disabled={isScheduling || !pickupDate}>
                                                {isScheduling ? 'Confirming...' : 'Confirm Manual Date'}
                                            </Button>
                                            
                                            <div className="relative my-1">
                                                <div className="absolute inset-0 flex items-center">
                                                    <span className="w-full border-t" />
                                                </div>
                                                <div className="relative flex justify-center text-xs uppercase">
                                                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                                                </div>
                                            </div>

                                            <Button variant="secondary" onClick={() => handleConfirmSchedule(order, undefined)} disabled={isScheduling}>
                                                <Rocket className="mr-2 h-4 w-4" />
                                                Auto Schedule (2 Days)
                                            </Button>

                                            <Button variant="ghost" size="sm" onClick={() => { setOrderIdToSchedule(null); onStatusUpdated(order.id, order.status); }} disabled={isScheduling}>
                                                Cancel
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
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
