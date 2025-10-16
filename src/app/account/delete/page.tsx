
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteUserAccount } from "@/app/actions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default function DeleteAccountPage() {
    const deleteAccountWithServerAction = async () => {
        "use server";
        const cookieStore = cookies();
        const result = await deleteUserAccount(cookieStore);
        if (result.success) {
             return redirect(`/login?message=${result.message}`);
        } else {
             return redirect(`/account/delete?message=Could not delete user: ${result.message}`);
        }
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
                    <form action={deleteAccountWithServerAction} className="w-full">
                        <Button variant="destructive" className="w-full">
                            Yes, delete my account
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    )
}
