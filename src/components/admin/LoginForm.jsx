"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, AlertCircle, Lock } from "lucide-react";
import Link from 'next/link';

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        if (!token) {
          setIsCheckingAuth(false);
          return;
        }
        const response = await fetch("/api/admin/check", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (data.isAdmin) {
          router.push(callbackUrl);
        } else {
          // Clear invalid token
          localStorage.removeItem("adminToken");
          setIsCheckingAuth(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        // Clear invalid token
        localStorage.removeItem("adminToken");
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [callbackUrl, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        // Store token in localStorage for client-side auth
        localStorage.setItem("adminToken", data.token);
        // Redirect to admin dashboard or callback URL
        router.push(callbackUrl);
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("An error occurred during login");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 text-white text-center">
          <div className="bg-white/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold"><span className="text-white">Admin Login</span></h1>
          <p className="mt-2 text-blue-100">Fashion Show Event Management</p>
        </div>
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Admin Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
                  placeholder="Enter admin password"
                  required
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter the admin password to access the dashboard
              </p>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Authenticating...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Login
                </>
              )}
            </button>
          </form>
          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-blue-600 hover:underline">
              Return to main page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}