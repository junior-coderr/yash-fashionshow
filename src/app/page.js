import RegistrationForm from "@/components/RegistrationForm";
import { Suspense } from "react";

// Server Component
export default function Home() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <RegistrationForm />
    </Suspense>
  );
}

// Simple loading skeleton for the form
function FormSkeleton() {
  return (
    <div className="min-h-screen py-6 sm:py-8 md:py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 relative">
      <div className="w-full max-w-4xl mb-6 sm:mb-8 md:mb-10 text-center relative z-10">
        <div className="h-12 w-3/4 mx-auto bg-gray-200 rounded-lg animate-pulse mb-4"></div>
        <div className="h-6 w-2/4 mx-auto bg-gray-200 rounded-md animate-pulse"></div>
      </div>

      <div className="w-full max-w-4xl mb-6 sm:mb-8 md:mb-10 z-10">
        <div className="backdrop-blur-xl bg-white/60 p-4 sm:p-6 rounded-2xl shadow-xl border border-white/70 transition-all">
          <div className="flex justify-between mb-2">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full w-full animate-pulse"></div>
        </div>
      </div>

      <div className="w-full max-w-4xl z-10">
        <div className="backdrop-blur-xl bg-white/70 p-5 sm:p-6 md:p-8 rounded-2xl shadow-xl border border-white/70">
          <div className="flex justify-center mb-8">
            <div className="h-16 w-16 rounded-full bg-gray-200 animate-pulse"></div>
          </div>
          <div className="h-8 w-64 mx-auto bg-gray-200 rounded-lg animate-pulse mb-4"></div>
          <div className="h-4 w-3/4 mx-auto bg-gray-200 rounded animate-pulse mb-8"></div>

          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 bg-gray-200 rounded-xl animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
