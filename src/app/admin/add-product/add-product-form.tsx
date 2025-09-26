// src/app/admin/add-product/add-product-form.tsx
'use client';
import { useEffect, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { addProduct, updateProduct, type Product, type ProductFormValues, type UpdateProductFormValues } from '@/app/actions';
import { Upload } from 'lucide-react';
import Image from 'next/image';

const formSchema = z.object({
  id: z.string().optional(),
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
  imageHint: z.string().optional(),
  image: z
    .custom<File>(v => v instanceof File, 'Image is required.')
    .refine(
      file => file.size <= 5000000,
      `Max file size is 5MB.`
    )
    .refine(
      file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Only .jpg, .png, and .webp formats are supported.'
    ).optional(),
});

type AddProductFormProps = {
    productToEdit?: Product | null;
    onProductAddedOrUpdated: () => void;
}

export function AddProductForm({ productToEdit, onProductAddedOrUpdated }: AddProductFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const {toast} = useToast();
  const isEditMode = !!productToEdit;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: '',
      name: '',
      description: '',
      price: 0,
      category: '',
      imageHint: '',
      image: undefined,
    },
  });

  useEffect(() => {
      if (productToEdit) {
          form.reset({
              id: productToEdit.id,
              name: productToEdit.name,
              description: productToEdit.description,
              price: productToEdit.price,
              category: productToEdit.category,
              image: undefined, // Clear image input on edit
              imageHint: productToEdit.images[0]?.hint || '',
          });
          setImagePreview(productToEdit.images[0]?.url || null);
      } else {
          form.reset({
            id: '',
            name: '',
            description: '',
            price: 0,
            category: '',
            imageHint: '',
            image: undefined,
          });
          setImagePreview(null);
      }
  }, [productToEdit, form]);

  const imageRef = form.register('image');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    
    let result;

    if (isEditMode && values.id) {
        const updateValues: UpdateProductFormValues = {
            id: values.id,
            name: values.name,
            description: values.description,
            price: values.price,
            category: values.category,
            image: values.image || null,
        };
        result = await updateProduct(updateValues);
    } else {
       if (!values.image) {
            form.setError('image', { type: 'manual', message: 'Image is required for a new product.' });
            return;
       }
        // Ensure imageHint is present for new products, even though it's optional in the schema for edit mode
        const addValues = {
            ...values,
            imageHint: values.imageHint || values.name,
        }
        result = await addProduct(addValues as ProductFormValues);
    }

    if (result.success) {
      toast({
        title: 'Success!',
        description: result.message,
      });
      form.reset();
      setImagePreview(null);
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
        <FormField
          control={form.control}
          name="price"
          render={({field}) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <Input type="number" placeholder="29.99" {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} value={field.value ?? ''} />
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
          render={({field: { onChange, value, ...fieldProps }}) => (
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
               {isEditMode && (
                  <FormDescription>Leave blank to keep the current image. Upload a new file to replace it.</FormDescription>
                )}
              <FormMessage />
            </FormItem>
          )}
        />
        {!isEditMode && <FormField
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
        />}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {isEditMode ? (form.formState.isSubmitting ? 'Updating...' : 'Update Product') : (form.formState.isSubmitting ? 'Adding...' : 'Add Product')}
        </Button>
      </form>
    </Form>
  );
}
