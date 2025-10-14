
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default function DeleteAccountPage() {
    const deleteAccount = async () => {
        "use server";
        const cookieStore = cookies();
        const supabase = createClient(cookieStore);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // We need to use the service role key to delete the user from auth.users
            const adminClient = createClient(
                cookies()
            );
            const { error } = await adminClient.auth.admin.deleteUser(user.id);
            if (error) {
                return redirect(`/account/delete?message=Could not delete user: ${error.message}`);
            }
        }
        revalidatePath('/', 'layout');
        return redirect("/login?message=Account deleted successfully.");
    }
    return (
        <div className="container mx-auto flex min-h-[80vh] items-center justify-center px-4 py-12">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Delete Account</CardTitle>
                    <CardDescription>Are you sure you want to delete your account? This action is irreversible.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-destructive">
                        This will permanently delete your account, your orders history, and remove all your data from our servers.
                    </p>
                </CardContent>
                <CardFooter>
                    <form action={deleteAccount} className="w-full">
                        <Button variant="destructive" className="w-full">
                            Yes, delete my account
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    )
}
