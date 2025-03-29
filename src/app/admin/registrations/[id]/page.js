"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  FileText,
  Calendar,
  Tag,
} from "lucide-react";
import { use } from "react";

export default function RegistrationDetails({ params }) {
  // Use React.use() to unwrap the params Promise as recommended by Next.js
  const unwrappedParams = use(params);
  const registrationId = unwrappedParams.id;

  const router = useRouter();
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState(null);

  useEffect(() => {
    fetchRegistrationDetails(registrationId);
  }, [registrationId]);

  const fetchRegistrationDetails = async (id) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken");

      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/registration/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setRegistration(data.registration);
    } catch (error) {
      console.error("Error fetching registration details:", error);
      setError(error.message || "Failed to fetch registration details");
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (status) => {
    try {
      setUpdating(true);
      setUpdateMessage(null);

      const token = localStorage.getItem("adminToken");
      const response = await fetch(
        `/api/admin/registrations/${registrationId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setRegistration({
          ...registration,
          paymentStatus: status,
          qrCodeImage:
            data.registration?.qrCodeImage || registration.qrCodeImage,
        });

        setUpdateMessage({
          type: "success",
          text: `Payment status updated to "${status}" successfully`,
        });
      } else {
        throw new Error(data.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      setUpdateMessage({
        type: "error",
        text: error.message || "Failed to update payment status",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading registration details...</p>
        </div>
      </div>
    );
  }

  if (error || !registration) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <p className="font-bold">Error</p>
          <p>{error || "Registration not found"}</p>
        </div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to registrations
        </button>
      </div>
    );
  }

  const formatParticipationCategories = () => {
    return Object.entries(registration.participationCategories || {})
      .filter(([_, selected]) => selected)
      .map(([category]) => {
        const formatted =
          category === "modelWalk"
            ? "Model Selection"
            : category === "movieSelection"
            ? "Movie Selection"
            : "Fashion Designer";
        return formatted;
      })
      .join(", ");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      {/* Header with back button and action buttons */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-1" /> Back to registrations
        </button>

        {registration.paymentStatus === "pending" && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => updatePaymentStatus("verified")}
              disabled={updating}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center transition-colors disabled:opacity-60 flex-1 sm:flex-none justify-center"
            >
              {updating ? (
                <span className="flex items-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                  Processing...
                </span>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" /> Verify Payment
                </>
              )}
            </button>
            <button
              onClick={() => updatePaymentStatus("rejected")}
              disabled={updating}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md flex items-center transition-colors disabled:opacity-60 flex-1 sm:flex-none justify-center"
            >
              {updating ? (
                <span className="flex items-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                  Processing...
                </span>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" /> Reject Payment
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Status update message */}
      {updateMessage && (
        <div
          className={`mb-6 p-4 rounded-md ${
            updateMessage.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          <div className="flex items-start">
            {updateMessage.type === "success" ? (
              <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            )}
            <p>{updateMessage.text}</p>
          </div>
        </div>
      )}

      <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 sm:px-6 py-4">
          <h1 className="text-xl font-bold text-white flex items-center">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-white" />{" "}
            <span className="text-white">Registration Details</span>
          </h1>
        </div>

        <div className="p-4 sm:p-6">
          {/* Status Badge */}
          <div className="mb-6 flex flex-wrap items-center">
            <span className="text-gray-600 mr-2 mb-2 sm:mb-0">Payment Status:</span>
            <span
              className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                registration.paymentStatus === "verified"
                  ? "bg-green-100 text-green-800"
                  : registration.paymentStatus === "rejected"
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {registration.paymentStatus.charAt(0).toUpperCase() +
                registration.paymentStatus.slice(1)}
            </span>
          </div>

          {/* Entry Status Badge */}
          {registration.paymentStatus === "verified" && (
            <div className="mb-6 flex flex-wrap items-center">
              <span className="text-gray-600 mr-2 mb-2 sm:mb-0">Entry Status:</span>
              <span
                className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                  registration.entryVerified
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {registration.entryVerified ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span className="whitespace-nowrap">
                      Verified at{" "}
                      {new Date(registration.entryTimestamp).toLocaleTimeString()}
                    </span>
                  </>
                ) : (
                  "Not Verified"
                )}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Tag className="h-5 w-5 mr-2 text-blue-600" /> Basic Information
              </h2>
              
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <span className="text-gray-600 font-medium sm:font-normal">Registration ID:</span>
                  <span className="sm:col-span-2 font-medium">
                    {registration.registrationId}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <span className="text-gray-600 font-medium sm:font-normal">Name:</span>
                  <span className="sm:col-span-2 font-medium">
                    {registration.name}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <span className="text-gray-600 font-medium sm:font-normal">Age:</span>
                  <span className="sm:col-span-2">{registration.age}</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <span className="text-gray-600 font-medium sm:font-normal">Gender:</span>
                  <span className="sm:col-span-2">{registration.gender}</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <span className="text-gray-600 font-medium sm:font-normal">Email:</span>
                  <a
                    href={`mailto:${registration.email}`}
                    className="sm:col-span-2 text-blue-600 hover:underline break-words"
                  >
                    {registration.email}
                  </a>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <span className="text-gray-600 font-medium sm:font-normal">Phone:</span>
                  <a
                    href={`tel:${registration.phone}`}
                    className="sm:col-span-2 text-blue-600 hover:underline"
                  >
                    {registration.phone}
                  </a>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <span className="text-gray-600 font-medium sm:font-normal">Education:</span>
                  <span className="sm:col-span-2">
                    {registration.educationStatus === "inCollege"
                      ? "In College"
                      : registration.educationStatus === "school"
                      ? "School"
                      : "None"}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center mt-6 lg:mt-0">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" /> Event
                Details
              </h2>
              
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <span className="text-gray-600 font-medium sm:font-normal">Registration Date:</span>
                  <span className="sm:col-span-2">
                    {new Date(registration.registrationDate).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <span className="text-gray-600 font-medium sm:font-normal">Categories:</span>
                  <span className="sm:col-span-2">
                    {formatParticipationCategories()}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <span className="text-gray-600 font-medium sm:font-normal">Total Amount:</span>
                  <span className="sm:col-span-2 font-medium">
                    ₹{registration.totalAmount}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <span className="text-gray-600 font-medium sm:font-normal">UTR ID:</span>
                  <span className="sm:col-span-2 break-words">{registration.utrId}</span>
                </div>
              </div>
              
              {/* Payment Screenshot */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  Payment Screenshot:
                </h3>
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  {registration.paymentScreenshotUrl ? (
                    <a
                      href={registration.paymentScreenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={registration.paymentScreenshotUrl}
                        alt="Payment Screenshot"
                        className="w-full h-48 object-contain bg-gray-50"
                      />
                    </a>
                  ) : (
                    <div className="h-48 bg-gray-50 flex items-center justify-center text-gray-400">
                      No screenshot available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* QR Code - Only visible for verified payments */}
          {registration.paymentStatus === "verified" && (
            <div className="mt-8 border-t pt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Entry QR Code
              </h2>
              
              <div className="flex justify-center">
                {registration.qrCodeImage ? (
                  <div className="p-2 sm:p-4 border border-gray-200 rounded-md bg-white inline-block">
                    <img
                      src={registration.qrCodeImage}
                      alt="Entry QR Code"
                      className="w-48 h-48 sm:w-64 sm:h-64 object-contain"
                    />
                    <p className="text-center text-sm text-gray-500 mt-2">
                      Scan to verify entry
                    </p>
                  </div>
                ) : (
                  <div
                    className="p-4 border border-gray-200 rounded-md bg-gray-50 flex items-center justify-center"
                    style={{ width: "100%", maxWidth: "256px", height: "256px" }}
                  >
                    <p className="text-gray-500 text-center">
                      QR Code not available. <br />
                      Try reloading the page.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
