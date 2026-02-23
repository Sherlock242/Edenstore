
import { getProducts } from '@/app/actions';
import { cookies } from 'next/headers';
import { AddProductTabs } from './add-product-tabs';

// This is the new Server Component entry point for the page.
// It performs the "heavy-lifting" of data fetching on the server.
export default async function AddProductAdminPage() {
  // We fetch the initial data on the server before rendering.
  const cookieStore = cookies();
  const initialProducts = await getProducts(cookieStore);

  // We pass the server-fetched data as a prop to our main client component.
  return <AddProductTabs initialProducts={initialProducts} />;
}
