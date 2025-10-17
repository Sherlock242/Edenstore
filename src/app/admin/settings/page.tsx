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
import { 
    getHeroImageUrlClient, 
    getSiteNameClient, 
    updateHeroImageAction, 
    updateSiteNameAction,
    getSiteLogoUrlClient,
    updateSiteLogoAction,
    getHeaderDisplayModeClient,
    updateHeaderDisplayModeAction,
    getAnnouncementBarSettingsClient,
    updateAnnouncementBarSettingsAction,
    type HeaderDisplayMode,
    type AnnouncementSettings,
} from '@/app/server-actions';
import Image from 'next/image';
import { Upload } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

const heroImageSchema = z.object({
  heroImage: z
    .custom<File>(v => v instanceof File, { message: 'Image is required.'})
    .refine(file => file.size <= 5000000, `Max file size is 5MB.`)
    .refine(file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type), 'Only .jpg, .png, and .webp formats are supported.')
});

const siteLogoSchema = z.object({
  siteLogo: z
    .custom<File>(v => v instanceof File, { message: 'Image is required.'})
    .refine(file => file.size <= 1000000, `Max file size is 1MB.`)
    .refine(file => ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type), 'Only .jpg, .png, .webp, and .svg formats are supported.')
});

const siteNameSchema = z.object({
  siteName: z.string().min(2, { message: 'Site name must be at least 2 characters.' }),
});

const headerDisplaySchema = z.object({
  displayMode: z.enum(['title', 'logo', 'both']),
});

const announcementSchema = z.object({
    enabled: z.boolean(),
    message: z.string().min(5, { message: 'Message must be at least 5 characters.' }).max(100, { message: 'Message must be 100 characters or less.'}),
});


export default function SiteSettingsPage() {
  const { toast } = useToast();
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const [isHeroSubmitting, setIsHeroSubmitting] = useState(false);
  const [isNameSubmitting, setIsNameSubmitting] = useState(false);
  const [isLogoSubmitting, setIsLogoSubmitting] = useState(false);
  const [isDisplaySubmitting, setIsDisplaySubmitting] = useState(false);
  const [isAnnouncementSubmitting, setIsAnnouncementSubmitting] = useState(false);

  const heroImageForm = useForm<z.infer<typeof heroImageSchema>>({ resolver: zodResolver(heroImageSchema) });
  const siteNameForm = useForm<z.infer<typeof siteNameSchema>>({ 
      resolver: zodResolver(siteNameSchema),
      defaultValues: {
          siteName: ''
      }
  });
  const siteLogoForm = useForm<z.infer<typeof siteLogoSchema>>({ resolver: zodResolver(siteLogoSchema) });
  const headerDisplayForm = useForm<z.infer<typeof headerDisplaySchema>>({ resolver: zodResolver(headerDisplaySchema) });
  const announcementForm = useForm<z.infer<typeof announcementSchema>>({ 
      resolver: zodResolver(announcementSchema),
      defaultValues: {
          enabled: false,
          message: ''
      }
  });
  
  useEffect(() => {
      // Fetch initial data for all forms
      getHeroImageUrlClient().then(result => {
          if (result.success && result.url) setHeroPreview(result.url);
      });
       getSiteLogoUrlClient().then(result => {
          if (result.success && result.url) setLogoPreview(result.url);
      });
      getSiteNameClient().then(name => {
          siteNameForm.setValue('siteName', name);
      });
       getHeaderDisplayModeClient().then(mode => {
          headerDisplayForm.setValue('displayMode', mode);
       });
       getAnnouncementBarSettingsClient().then(settings => {
            announcementForm.reset(settings);
       });
  }, [siteNameForm, headerDisplayForm, announcementForm]);

  const onHeroImageSubmit = async (values: z.infer<typeof heroImageSchema>) => {
    setIsHeroSubmitting(true);
    const result = await updateHeroImageAction(values.heroImage);
    toast({ title: result.success ? 'Success!' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive'});
    if (result.success && result.url) setHeroPreview(result.url);
    heroImageForm.reset();
    setIsHeroSubmitting(false);
  }

  const onSiteLogoSubmit = async (values: z.infer<typeof siteLogoSchema>) => {
    setIsLogoSubmitting(true);
    const result = await updateSiteLogoAction(values.siteLogo);
    toast({ title: result.success ? 'Success!' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive'});
    if (result.success && result.url) setLogoPreview(result.url);
    siteLogoForm.reset();
    setIsLogoSubmitting(false);
  }

  const onSiteNameSubmit = async (values: z.infer<typeof siteNameSchema>) => {
      setIsNameSubmitting(true);
      const result = await updateSiteNameAction(values.siteName);
      toast({ title: result.success ? 'Success!' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
      setIsNameSubmitting(false);
  }
  
  const onHeaderDisplaySubmit = async (values: z.infer<typeof headerDisplaySchema>) => {
      setIsDisplaySubmitting(true);
      const result = await updateHeaderDisplayModeAction(values.displayMode as HeaderDisplayMode);
      toast({ title: result.success ? 'Success!' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
      setIsDisplaySubmitting(false);
  }

  const onAnnouncementSubmit = async (values: z.infer<typeof announcementSchema>) => {
      setIsAnnouncementSubmitting(true);
      const result = await updateAnnouncementBarSettingsAction(values);
      toast({ title: result.success ? 'Success!' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
      setIsAnnouncementSubmitting(false);
  }
  
  const { register: registerHero } = heroImageForm;
  const { ref: heroInputRef, ...heroInputProps } = registerHero('heroImage');
  const { register: registerLogo } = siteLogoForm;
  const { ref: logoInputRef, ...logoInputProps } = registerLogo('siteLogo');


  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      <Card>
        <CardHeader>
          <CardTitle>Site Settings</CardTitle>
          <CardDescription>Manage global settings for your website.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-12">

            {/* Announcement Bar Section */}
            <div className="space-y-8">
                <h3 className="text-lg font-medium">Promotional Bar</h3>
                <Form {...announcementForm}>
                    <form onSubmit={announcementForm.handleSubmit(onAnnouncementSubmit)} className="space-y-6">
                        <FormField
                            control={announcementForm.control}
                            name="enabled"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Enable Promotional Bar</FormLabel>
                                        <FormDescription>Show a scrolling promotional message at the top of the site.</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={announcementForm.control}
                            name="message"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Promotional Message</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Free shipping on orders over $50" {...field} />
                                    </FormControl>
                                    <FormDescription>The text that will scroll in the announcement bar.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isAnnouncementSubmitting}>
                            {isAnnouncementSubmitting ? 'Saving...' : 'Save Promotion Settings'}
                        </Button>
                    </form>
                </Form>
            </div>

             <Separator />

            {/* Header Branding Section */}
            <div className="space-y-8">
                <h3 className="text-lg font-medium">Header Branding</h3>

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
                            <FormDescription>This is displayed in the header and page titles.</FormDescription>
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
                
                {/* Site Logo Form */}
                <Form {...siteLogoForm}>
                    <form onSubmit={siteLogoForm.handleSubmit(onSiteLogoSubmit)} className="space-y-4">
                        <FormField
                            control={siteLogoForm.control}
                            name="siteLogo"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Site Logo</FormLabel>
                                <FormControl>
                                <div className="flex w-full items-center justify-center">
                                    <label htmlFor="logo-upload" className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card hover:bg-muted">
                                    {logoPreview ? (
                                        <Image src={logoPreview} alt="Logo preview" width={120} height={120} className="h-full w-full object-contain p-4"/>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center pb-6 pt-5"> <Upload className="mb-4 h-8 w-8 text-muted-foreground" /> <p className="text-xs text-muted-foreground">Click or drag to upload</p> </div>
                                    )}
                                    <Input
                                        id="logo-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/svg+xml"
                                        {...logoInputProps}
                                        ref={logoInputRef}
                                        onChange={event => {
                                            const file = event.target.files?.[0];
                                            if (file) { 
                                                field.onChange(file); 
                                                const reader = new FileReader(); 
                                                reader.onloadend = () => { setLogoPreview(reader.result as string); }; 
                                                reader.readAsDataURL(file); 
                                            }
                                        }}
                                    />
                                    </label>
                                </div>
                                </FormControl>
                                <FormDescription>Upload your site's logo (PNG, JPG, WEBP, or SVG). Max 1MB.</FormDescription>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isLogoSubmitting}>{isLogoSubmitting ? 'Uploading...' : 'Update Logo'}</Button>
                    </form>
                </Form>

                 <Separator />

                {/* Header Display Mode */}
                <Form {...headerDisplayForm}>
                    <form onSubmit={headerDisplayForm.handleSubmit(onHeaderDisplaySubmit)} className="space-y-4">
                    <FormField
                        control={headerDisplayForm.control}
                        name="displayMode"
                        render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Header Display Style</FormLabel>
                             <FormDescription>Choose what to display in the header.</FormDescription>
                            <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} value={field.value} className="flex flex-col space-y-1">
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value="title" /></FormControl>
                                <FormLabel className="font-normal">Title Only</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value="logo" /></FormControl>
                                <FormLabel className="font-normal">Logo Only</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value="both" /></FormControl>
                                <FormLabel className="font-normal">Both Logo and Title</FormLabel>
                                </FormItem>
                            </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={isDisplaySubmitting}>{isDisplaySubmitting ? 'Saving...' : 'Save Display Style'}</Button>
                    </form>
                </Form>
            </div>

            <Separator />
          
            {/* Hero Image Form */}
            <div className="space-y-8">
                <h3 className="text-lg font-medium">Homepage Hero Image</h3>
                <Form {...heroImageForm}>
                    <form onSubmit={heroImageForm.handleSubmit(onHeroImageSubmit)} className="space-y-4">
                    <FormField
                        control={heroImageForm.control}
                        name="heroImage"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Hero Image</FormLabel>
                            <FormControl>
                            <div className="flex w-full items-center justify-center">
                                <label htmlFor="image-upload" className="flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card hover:bg-muted">
                                {heroPreview ? (
                                    <Image src={heroPreview} alt="Image preview" width={400} height={200} className="h-full w-full object-contain"/>
                                ) : (
                                    <div className="flex flex-col items-center justify-center pb-6 pt-5"><Upload className="mb-4 h-8 w-8 text-muted-foreground" /><p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p><p className="text-xs text-muted-foreground">PNG, JPG, or WEBP (MAX. 5MB)</p></div>
                                )}
                                <Input
                                    id="image-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp"
                                    {...heroInputProps}
                                    ref={heroInputRef}
                                    onChange={event => {
                                        const file = event.target.files?.[0];
                                        if (file) { 
                                          field.onChange(file); 
                                          const reader = new FileReader(); 
                                          reader.onloadend = () => { setHeroPreview(reader.result as string); }; 
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
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
