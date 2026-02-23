import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoginForm } from './login-form';

export default function LoginPage({ searchParams }: { searchParams: { message: string } }) {
  return (
    <div className="container mx-auto flex min-h-[80vh] items-center justify-center px-4 py-8 md:py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Welcome!</CardTitle>
          <CardDescription>Sign in to continue to your account.</CardDescription>
        </CardHeader>
        <LoginForm searchParams={searchParams} />
      </Card>
    </div>
  );
}
