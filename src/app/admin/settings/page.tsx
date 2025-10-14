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
import { getHeroImageUrlClient, getSiteNameClient, updateHeroImageAction, updateSiteNameAction } from '@/app/server-actions';
import Image from 'next/image';
import { Upload } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const heroImageSchema = z.object({
  heroImage: z
    .custom<File>(v => v instanceof File, { message: 'Image is required.'})
    .refine(
      file => file.size <= 5000000, // 5MB
      `Max file size is 5MB.`
    )
    .refine(
      file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Only .jpg, .png, and .webp formats are supported.'
    )
});

const siteNameSchema = z.object({
  siteName: z.string().min(2, { message: 'Site name must be at least 2 characters.' }),
});

export default function SiteSettingsPage() {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isHeroSubmitting, setIsHeroSubmitting] = useState(false);
  const [isNameSubmitting, setIsNameSubmitting] = useState(false);

  const heroImageForm = useForm<z.infer<typeof heroImageSchema>>({
    resolver: zodResolver(heroImageSchema),
    defaultValues: {
      heroImage: undefined,
    },
  });
  
  const siteNameForm = useForm<z.infer<typeof siteNameSchema>>({
    resolver: zodResolver(siteNameSchema),
    defaultValues: {
      siteName: '',
    },
  });
  
  useEffect(() => {
      // Fetch initial data for both forms
      getHeroImageUrlClient().then(result => {
          if (result.success && result.url) {
              setImagePreview(result.url);
          }
      });
      getSiteNameClient().then(name => {
          siteNameForm.setValue('siteName', name);
      })
  }, [siteNameForm]);

  const onHeroImageSubmit = async (values: z.infer<typeof heroImageSchema>) => {
    setIsHeroSubmitting(true);
    const result = await updateHeroImageAction(values.heroImage);

    if (result.success) {
      toast({
        title: 'Success!',
        description: result.message,
      });
      if(result.url) {
          setImagePreview(result.url);
      }
      heroImageForm.reset();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    }
    setIsHeroSubmitting(false);
  }

  const onSiteNameSubmit = async (values: z.infer<typeof siteNameSchema>) => {
      setIsNameSubmitting(true);
      const result = await updateSiteNameAction(values.siteName);

      if (result.success) {
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
      setIsNameSubmitting(false);
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      <Card>
        <CardHeader>
          <CardTitle>Site Settings</CardTitle>
          <CardDescription>Manage global settings for your website.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">

          {/* Site Name Form */}
          <Form {...siteNameForm}>
            <form onSubmit={siteNameForm.handleSubmit(onSiteNameSubmit)} className="space-y-4">
              <FormField
                control={siteNameForm.control}
                name="siteName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ANISTORE" {...field} />
                    </FormControl>
                    <FormDescription>This is the name displayed in the header and page titles.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isNameSubmitting}>
                {isNameSubmitting ? 'Updating...' : 'Update Site Name'}
              </Button>
            </form>
          </Form>
          
          <Separator />

          {/* Hero Image Form */}
          <Form {...heroImageForm}>
            <form onSubmit={heroImageForm.handleSubmit(onHeroImageSubmit)} className="space-y-4">
              <FormField
                control={heroImageForm.control}
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
              <Button type="submit" disabled={isHeroSubmitting}>
                {isHeroSubmitting ? 'Updating...' : 'Update Hero Image'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
