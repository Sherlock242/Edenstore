
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
import { Upload, X } from 'lucide-react';
import Image from 'next/image';

const sizeSchema = z.object({
  size: z.string().min(1, 'Size is required.'),
  quantity: z.coerce.number().min(0, 'Quantity must be 0 or more.'),
});

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
  weight: z.coerce.number().positive({message: 'Weight must be a positive number (in kg).'}),
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
  sizes: z.array(sizeSchema).min(1, 'At least one size is required.'),
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
      price: undefined,
      category: '',
      weight: undefined,
      imageHint: '',
      image: undefined,
      sizes: [{ size: 'S', quantity: 10 }],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sizes"
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
              image: undefined, // Clear image input on edit
              imageHint: productToEdit.images[0]?.hint || '',
              sizes: productToEdit.sizes,
          });
          setImagePreview(productToEdit.images[0]?.url || null);
      } else {
          form.reset({
            id: '',
            name: '',
            description: '',
            price: undefined,
            category: '',
            weight: undefined,
            imageHint: '',
            image: undefined,
            sizes: [{size: 'S', quantity: 10}, {size: 'M', quantity: 10}],
          });
          setImagePreview(null);
      }
  }, [productToEdit, form]);

  const imageRef = form.register('image');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    
    let result;

    if (isEditMode && values.id) {
        const updateValues = {
            id: values.id,
            name: values.name,
            description: values.description,
            price: values.price,
            category: values.category,
            weight: values.weight,
            image: values.image || null,
            sizes: values.sizes
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
            image: values.image,
            sizes: values.sizes
        }
        result = await addProduct(addValues);
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
                {fields.map((field, index) => (
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
                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ size: "", quantity: 0 })}>
                    Add Size
                </Button>
                 {form.formState.errors.sizes && <p className="text-sm font-medium text-destructive">{form.formState.errors.sizes.message}</p>}
            </div>
        </div>


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
