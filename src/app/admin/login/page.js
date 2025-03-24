import { Suspense } from "react";
import LoginForm from "@/components/admin/LoginForm";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading login form...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
