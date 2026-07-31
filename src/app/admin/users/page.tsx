'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { UserProfileInfo } from './actions';
import { getAllUsers } from './actions';
import { Loader2, Users } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch of users
    getAllUsers().then(result => {
      if (result.success && result.users) {
        setUsers(result.users);
      } else {
        setError(result.message);
      }
      setIsLoading(false);
    });

    // Set up real-time subscription for new user sign-ups
    const channel = supabase
      .channel('realtime-users')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'users' },
        (payload) => {
          const newUser = payload.new as UserProfileInfo;
          // Add the new user to the top of the list to maintain sort order
          setUsers(currentUsers => [newUser, ...currentUsers].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 py-8 text-center md:py-12">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        <p className="sr-only">Loading users...</p>
      </div>
    );
  }

  if (error) {
     return (
        <div className="container mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center gap-4 px-4 py-8 text-center md:py-12">
            <h1 className="font-headline text-3xl font-bold text-destructive">An Error Occurred</h1>
            <p className="text-muted-foreground">{error}</p>
        </div>
     );
  }

  const sortedUsers = users.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registered Users</CardTitle>
              <CardDescription>A list of all users who have signed up.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-muted-foreground"/>
                <Badge variant="secondary" className="text-lg">{users.length}</Badge>
                <span className="text-sm text-muted-foreground">Total Users</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[80px]">Sr. No.</TableHead>
                    <TableHead>User Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Registration Date</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {sortedUsers.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No users found.
                        </TableCell>
                    </TableRow>
                )}
                {sortedUsers.map((user, index) => (
                    <TableRow key={user.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{user.display_name || "N/A"}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell suppressHydrationWarning>{format(new Date(user.created_at), 'MMM dd, yyyy')}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}