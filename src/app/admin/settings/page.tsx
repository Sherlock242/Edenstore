
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getHeroImageUrl, updateHeroImage } from './actions';
import Image from 'next/image';
import { Upload } from 'lucide-react';

const formSchema = z.object({
  heroImage: z
    .custom<File>(v => v instanceof File, 'Image is required.')
    .refine(
      file => file.size <= 5000000, // 5MB
      `Max file size is 5MB.`
    )
    .refine(
      file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Only .jpg, .png, and .webp formats are supported.'
    )
});

export default function SiteSettingsPage() {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      heroImage: undefined,
    },
  });
  
  useEffect(() => {
      // Fetch the current hero image on component mount
      getHeroImageUrl().then(result => {
          if (result.success && result.url) {
              setImagePreview(result.url);
          }
      })
  }, [])

  const imageRef = form.register('heroImage');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const result = await updateHeroImage(values.heroImage);

    if (result.success) {
      toast({
        title: 'Success!',
        description: result.message,
      });
      if(result.url) {
          setImagePreview(result.url);
      }
      form.reset();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    }
    setIsSubmitting(false);
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      <Card>
        <CardHeader>
          <CardTitle>Site Settings</CardTitle>
          <CardDescription>Manage global settings for your website.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="heroImage"
                render={({ field: { onChange, value, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Homepage Hero Image</FormLabel>
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
                              width={400}
                              height={200}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center pb-6 pt-5">
                              <Upload className="mb-4 h-8 w-8 text-muted-foreground" />
                              <p className="mb-2 text-sm text-muted-foreground">
                                <span className="font-semibold">Click to upload</span> or drag and drop
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
                    <FormDescription>This image will be displayed on the homepage hero section.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Hero Image'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
