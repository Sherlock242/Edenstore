
// src/app/admin/add-product/add-product-form.tsx
'use client';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { useToast } from '@/hooks/use-toast';
import { addProduct, updateProduct, type Product } from '@/app/actions';
import { Plus, Upload, X } from 'lucide-react';
import Image from 'next/image';

const sizeSchema = z.object({
  size: z.string().min(1, 'Size is required.'),
  quantity: z.coerce.number().min(0, 'Quantity must be 0 or more.'),
});

const imageSchema = z.object({
  file: z.custom<File>(v => v instanceof File, 'Image file is required.')
    .refine(file => file.size <= 5000000, `Max file size is 5MB.`)
    .refine(
      file => file.type ? ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) : true,
      'Only .jpg, .png, and .webp formats are supported.'
    ).optional(),
  hint: z.string().min(1, 'Hint is required.'),
  preview: z.string().optional()
});

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Product name must be at least 2 characters.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  price: z.coerce.number().positive('Price must be a positive number.'),
  category: z.string().min(2, 'Category must be at least 2 characters.'),
  weight: z.coerce.number().positive('Weight must be a positive number (in kg).'),
  sizes: z.array(sizeSchema).min(1, 'At least one size is required.'),
  images: z.array(imageSchema).min(1, 'At least one image is required.'),
});

type AddProductFormProps = {
    productToEdit?: Product | null;
    onProductAddedOrUpdated: () => void;
}

export function AddProductForm({ productToEdit, onProductAddedOrUpdated }: AddProductFormProps) {
  const { toast } = useToast();
  const isEditMode = !!productToEdit;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: '',
      name: '',
      description: '',
      price: undefined,
      category: '',
      weight: undefined,
      sizes: [{ size: 'S', quantity: 10 }],
      images: [],
    },
  });
  
  const { fields: sizeFields, append: appendSize, remove: removeSize } = useFieldArray({
    control: form.control,
    name: "sizes"
  });
  
  const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({
    control: form.control,
    name: "images"
  });

  useEffect(() => {
      if (productToEdit) {
          form.reset({
              id: productToEdit.id,
              name: productToEdit.name,
              description: productToEdit.description,
              price: productToEdit.price,
              category: productToEdit.category,
              weight: productToEdit.weight,
              sizes: productToEdit.sizes,
              images: productToEdit.images.map(img => ({
                hint: img.hint,
                preview: img.url
              })),
          });
      } else {
          form.reset({
            id: '',
            name: '',
            description: '',
            price: undefined,
            category: '',
            weight: undefined,
            sizes: [{size: 'S', quantity: 10}, {size: 'M', quantity: 10}],
            images: [{ hint: '' }],
          });
      }
  }, [productToEdit, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    let result;
    const imagesWithFiles = values.images.filter(img => img.file && img.file.size > 0) as { file: File; hint: string }[];

    if (isEditMode && values.id) {
        const updateValues = {
            id: values.id,
            name: values.name,
            description: values.description,
            price: values.price,
            category: values.category,
            weight: values.weight,
            sizes: values.sizes,
            images: imagesWithFiles,
        };
        result = await updateProduct(updateValues);
    } else {
        if (imagesWithFiles.length === 0) {
            form.setError('images', { type: 'manual', message: 'At least one new image file is required.' });
            return;
        }
        const addValues = {
            ...values,
            images: imagesWithFiles,
        };
        result = await addProduct(addValues);
    }

    if (result.success) {
      toast({
        title: 'Success!',
        description: result.message,
      });
      form.reset();
      onProductAddedOrUpdated();
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
            control={form.control}
            name="price"
            render={({field}) => (
                <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" placeholder="29.99" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="weight"
            render={({field}) => (
                <FormItem>
                <FormLabel>Weight (kg)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.1" placeholder="0.5" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
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

        {/* Sizes and Quantities */}
        <div>
            <FormLabel>Sizes & Inventory</FormLabel>
            <FormDescription>Add the sizes available and their stock quantity.</FormDescription>
            <div className="space-y-4 mt-4">
                {sizeFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-4">
                        <FormField
                            control={form.control}
                            name={`sizes.${index}.size`}
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input placeholder="Size (e.g., M)" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`sizes.${index}.quantity`}
                            render={({ field }) => (
                                <FormItem className="w-28">
                                    <FormControl>
                                        <Input type="number" placeholder="Qty" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeSize(index)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendSize({ size: "", quantity: 0 })}>
                    Add Size
                </Button>
                 {form.formState.errors.sizes && <p className="text-sm font-medium text-destructive">{form.formState.errors.sizes.root?.message}</p>}
            </div>
        </div>

        {/* Product Images */}
        <div>
            <FormLabel>Product Images</FormLabel>
            <FormDescription>Add one or more images for the product.</FormDescription>
            <div className="space-y-6 mt-4">
                {imageFields.map((field, index) => {
                    const imageValue = form.watch(`images.${index}`);
                    return (
                        <div key={field.id} className="p-4 border rounded-md space-y-4 relative">
                           <Button type="button" variant="destructive" size="icon" className="absolute -top-3 -right-3 h-7 w-7" onClick={() => removeImage(index)}><X className="h-4 w-4" /></Button>
                            <FormField
                                control={form.control}
                                name={`images.${index}.file`}
                                render={({ field: { onChange, value, ...fieldProps } }) => (
                                <FormItem>
                                    <FormLabel>Image File</FormLabel>
                                    <FormControl>
                                    <div className="flex w-full items-center justify-center">
                                        <label htmlFor={`image-upload-${index}`} className="flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card hover:bg-muted">
                                        {imageValue.preview ? (
                                            <Image src={imageValue.preview} alt="Preview" width={150} height={150} className="h-full w-full object-contain" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center pb-6 pt-5">
                                            <Upload className="mb-4 h-8 w-8 text-muted-foreground" />
                                            <p className="text-xs text-muted-foreground">Click or drag to upload</p>
                                            </div>
                                        )}
                                        <Input
                                            id={`image-upload-${index}`} type="file" className="hidden" accept="image/png, image/jpeg, image/webp"
                                            {...fieldProps}
                                            onChange={event => {
                                                const file = event.target.files?.[0];
                                                if (file) {
                                                    onChange(file);
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        form.setValue(`images.${index}.preview`, reader.result as string)
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                        </label>
                                    </div>
                                    </FormControl>
                                    {isEditMode && imageValue.preview && !imageValue.file && (
                                        <FormDescription>This is the current image. To add a new one, upload a file.</FormDescription>
                                    )}
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name={`images.${index}.hint`}
                                render={({field}) => (
                                    <FormItem>
                                    <FormLabel>Image Hint</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., anime character posing" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )
                })}
                 <Button type="button" variant="outline" size="sm" onClick={() => appendImage({ hint: '' })}>
                    <Plus className="mr-2 h-4 w-4" /> Add Image
                </Button>
                 {form.formState.errors.images && <p className="text-sm font-medium text-destructive">{form.formState.errors.images.root?.message || form.formState.errors.images.message}</p>}
            </div>
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {isEditMode ? (form.formState.isSubmitting ? 'Updating...' : 'Update Product') : (form.formState.isSubmitting ? 'Adding...' : 'Add Product')}
        </Button>
      </form>
    </Form>
  );
}
