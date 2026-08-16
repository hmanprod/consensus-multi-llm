import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { authEnabled } from "@/lib/user-context";

export default function SignInPage() {
  if (!authEnabled()) redirect("/");
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface p-6">
      <SignIn />
    </div>
  );
}