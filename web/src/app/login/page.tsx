import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p className="mt-2 text-muted">Demo accounts. Each role sees a different slice of the app.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
