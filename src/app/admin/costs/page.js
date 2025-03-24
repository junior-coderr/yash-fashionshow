"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import CategoryCostManager from "@/components/admin/CategoryCostManager";
import PaymentQRManager from "@/components/admin/PaymentQRManager";

export default function CostManagement() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAdminStatus().then((adminStatus) => {
      setIsAdmin(adminStatus);
      setAdminLoading(false);
    });
  }, []);

  const checkAdminStatus = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await fetch("/api/admin/check", { headers });
      const data = await response.json();

      return data.isAdmin;
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  };

  if (adminLoading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[80vh]">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="bg-yellow-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-yellow-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600 mb-6">
            You need to log in as an administrator to access this page.
          </p>
          <button
            onClick={() => router.push("/admin/login")}
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Login as Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-8">Event Management</h1>
      
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Category Cost Management</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <CategoryCostManager />
        </div>
      </div>
      
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Payment QR Code Management</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <PaymentQRManager />
        </div>
      </div>
    </div>
  );
}