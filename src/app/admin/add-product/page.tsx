
// src/app/admin/add-product/page.tsx
'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { addProduct, type ProductFormValues } from '@/app/actions';
import { Upload } from 'lucide-react';
import Image from 'next/image';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Product name must be at least 2 characters.',
  }),
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }),
  price: z.coerce.number().positive({message: 'Price must be a positive number.'}),
  category: z.string().min(2, {
    message: 'Category must be at least 2 characters.',
  }),
  imageHint: z.string().min(2, {
    message: 'Image hint must be at least 2 characters.',
  }),
  image: z
    .custom<File>(v => v instanceof File, 'Image is required.')
    .refine(
      file => file.size <= 5000000,
      `Max file size is 5MB.`
    )
    .refine(
      file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Only .jpg, .png, and .webp formats are supported.'
    ),
});

export default function AddProductPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const {toast} = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      category: '',
      imageHint: '',
      image: undefined,
    },
  });

  const imageRef = form.register('image');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const result = await addProduct(values as ProductFormValues);
    if (result.success) {
      toast({
        title: 'Success!',
        description: result.message,
      });
      form.reset();
      setImagePreview(null);
    } else {
      let errorMessage = 'Something went wrong.';
      if (typeof result.error?.message === 'string') {
          errorMessage = result.error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
      <Card>
        <CardHeader>
          <CardTitle>Add New Product</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Gojo's Infinity Tee" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the product" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="29.99" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Jujutsu Kaisen" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image"
                render={({field: { onChange, ...fieldProps }}) => (
                  <FormItem>
                    <FormLabel>Product Image</FormLabel>
                    <FormControl>
                      <div className="flex w-full items-center justify-center">
                        <label
                          htmlFor="image-upload"
                          className="flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card hover:bg-muted"
                        >
                          {imagePreview ? (
                            <Image
                              src={imagePreview}
                              alt="Image preview"
                              width={200}
                              height={200}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center pb-6 pt-5">
                              <Upload className="mb-4 h-8 w-8 text-muted-foreground" />
                              <p className="mb-2 text-sm text-muted-foreground">
                                <span className="font-semibold">Click to upload</span> or drag
                                and drop
                              </p>
                              <p className="text-xs text-muted-foreground">
                                PNG, JPG, or WEBP (MAX. 5MB)
                              </p>
                            </div>
                          )}
                          <Input
                            id="image-upload"
                            type="file"
                            className="hidden"
                            accept="image/png, image/jpeg, image/webp"
                            {...fieldProps}
                            onChange={event => {
                              const file = event.target.files?.[0];
                              if (file) {
                                onChange(file);
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setImagePreview(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="imageHint"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Image Hint</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., anime character" {...field} />
                    </FormControl>
                    <FormDescription>
                      A fallback hint for the AI if the image cannot be used.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Adding Product...' : 'Add Product'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
