"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, AlertTriangle, Lock } from "lucide-react";
import { use } from "react";

export default function VerifyPage({ params }) {
  // Fix: Use React.use() to unwrap params
  const unwrappedParams = use(params);
  const paramId = unwrappedParams.id;
  const [registrationId, setRegistrationId] = useState(paramId);
  const router = useRouter();
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Only run these effects when registrationId is available
  useEffect(() => {
    if (!registrationId) return;
    
    // Check if user is admin
    const checkAdmin = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        setAdminToken(token);
        
        if (!token) {
          setIsAdmin(false);
          setShowLoginPrompt(true);
          return;
        }
        
        const response = await fetch("/api/admin/check", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setIsAdmin(data.isAdmin);
        if (!data.isAdmin) {
          setShowLoginPrompt(true);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
        setShowLoginPrompt(true);
      }
    };

    // Fetch registration details
    const fetchRegistration = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/registration/${registrationId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch registration details");
        }
        const data = await response.json();
        setRegistration(data.registration);
      } catch (error) {
        console.error("Error fetching registration:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    checkAdmin();
    fetchRegistration();
  }, [registrationId]);

  const verifyEntry = async () => {
    if (!registrationId || !isAdmin || !adminToken) {
      setVerificationMessage({
        type: "error",
        text: "You are not authorized to mark entry. Please login as an administrator.",
      });
      return;
    }
    
    setVerifying(true);
    try {
      const response = await fetch(
        `/api/registration/${registrationId}/verify-entry`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${adminToken}`
          },
        }
      );
      
      const data = await response.json();
      
      if (response.ok) {
        setVerificationMessage({
          type: "success",
          text: "Entry successfully verified!",
        });
        // Update the local registration state with entry verification
        setRegistration({
          ...registration,
          entryVerified: true,
          entryTimestamp: new Date().toISOString(),
        });
      } else {
        if (data.alreadyVerified) {
          setVerificationMessage({
            type: "warning",
            text: `Entry was already verified at ${new Date(data.entryTimestamp).toLocaleTimeString()}`,
          });
          
          // Update registration state to reflect verification
          setRegistration({
            ...registration,
            entryVerified: true,
            entryTimestamp: data.entryTimestamp,
          });
        } else {
          setVerificationMessage({
            type: "error",
            text: data.message || "Failed to verify entry",
          });
        }
      }
    } catch (error) {
      console.error("Error verifying entry:", error);
      setVerificationMessage({
        type: "error",
        text: "An error occurred while verifying entry",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleAdminLogin = () => {
    // Save the current URL to return after login
    if (typeof window !== "undefined") {
      localStorage.setItem("redirectAfterLogin", window.location.pathname);
    }
    router.push("/admin/login");
  };

  // Show loading state while waiting for registrationId
  if (!registrationId || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 sm:px-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading registration details...</p>
        </div>
      </div>
    );
  }

  if (error || !registration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 sm:p-6">
        <div className="bg-white rounded-lg shadow-lg p-5 sm:p-6 max-w-sm sm:max-w-md w-full mx-auto">
          <div className="flex items-center justify-center text-red-500 mb-4">
            <XCircle size={48} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-center mb-4">
            Verification Failed
          </h1>
          <p className="text-center text-gray-700 mb-4 text-sm sm:text-base">
            {error || "Registration not found or invalid QR code."}
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-sm sm:max-w-md md:max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 sm:px-6 py-3 sm:py-4">
            <h1 className="text-lg sm:text-xl font-bold text-white">
              <span className="text-white">Registration Verification</span>
            </h1>
          </div>
          
          {/* Admin Authentication Banner */}
          {!isAdmin && (
            <div className="bg-yellow-50 px-4 sm:px-6 py-3 border-b flex items-start">
              <Lock className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-700 font-medium text-sm">Admin Authentication Required</p>
                <p className="text-yellow-600 text-xs mt-1">Only administrators can verify entry passes.</p>
                <button 
                  onClick={handleAdminLogin}
                  className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs py-1 px-3 rounded transition-colors"
                >
                  Login as Admin
                </button>
              </div>
            </div>
          )}
          
          {/* Verification Status */}
          <div
            className={`px-4 sm:px-6 py-3 sm:py-4 border-b ${
              registration.paymentStatus === "verified"
                ? "bg-green-50"
                : "bg-yellow-50"
            }`}
          >
            <div className="flex items-center flex-wrap sm:flex-nowrap">
              {registration.paymentStatus === "verified" ? (
                <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
              )}
              <span className="font-medium text-sm sm:text-base">
                Payment Status:
                <span
                  className={`ml-1 ${
                    registration.paymentStatus === "verified"
                      ? "text-green-700"
                      : "text-yellow-700"
                  }`}
                >
                  {registration.paymentStatus.charAt(0).toUpperCase() +
                    registration.paymentStatus.slice(1)}
                </span>
              </span>
            </div>
            <div className="flex items-center mt-2 flex-wrap sm:flex-nowrap">
              {registration.entryVerified ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                  <span className="font-medium text-green-700 text-sm sm:text-base">
                    Entry already verified at{" "}
                    {new Date(registration.entryTimestamp).toLocaleTimeString()}
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                  <span className="font-medium text-blue-700 text-sm sm:text-base">
                    Entry not yet verified
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Registration Details */}
          <div className="px-4 sm:px-6 py-3 sm:py-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
              Registration Details
            </h2>
            <div className="space-y-2 sm:space-y-3 text-sm sm:text-base">
              <div className="flex justify-between items-baseline flex-wrap sm:flex-nowrap">
                <span className="text-gray-600 mr-2">Registration ID:</span>
                <span className="font-medium break-all">
                  {registration.registrationId}
                </span>
              </div>
              <div className="flex justify-between items-baseline flex-wrap sm:flex-nowrap">
                <span className="text-gray-600 mr-2">Name:</span>
                <span className="font-medium break-words">
                  {registration.name}
                </span>
              </div>
              <div className="flex justify-between items-baseline flex-wrap sm:flex-nowrap">
                <span className="text-gray-600 mr-2">Email:</span>
                <span className="font-medium break-all">
                  {registration.email}
                </span>
              </div>
              <div className="flex justify-between items-baseline flex-wrap sm:flex-nowrap">
                <span className="text-gray-600 mr-2">Phone:</span>
                <span className="font-medium">{registration.phone}</span>
              </div>
              <div className="flex justify-between items-baseline flex-wrap sm:flex-nowrap">
                <span className="text-gray-600 mr-2">Registration Date:</span>
                <span className="font-medium">
                  {new Date(registration.registrationDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-baseline flex-wrap sm:flex-nowrap">
                <span className="text-gray-600 mr-2">Categories:</span>
                <span className="font-medium text-right">
                  {Object.entries(registration.participationCategories)
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
                    .join(", ")}
                </span>
              </div>
              <div className="flex justify-between items-baseline flex-wrap sm:flex-nowrap">
                <span className="text-gray-600 mr-2">Amount Paid:</span>
                <span className="font-medium">₹{registration.totalAmount}</span>
              </div>
            </div>
          </div>
          
          {/* Admin Actions */}
          {isAdmin &&
            registration.paymentStatus === "verified" &&
            !registration.entryVerified && (
              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t">
                <button
                  onClick={verifyEntry}
                  disabled={verifying}
                  className="w-full py-2 sm:py-3 px-3 sm:px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium flex items-center justify-center text-sm sm:text-base"
                >
                  {verifying ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Entry
                    </>
                  )}
                </button>
              </div>
            )}
            
          {/* Entry Already Verified */}
          {registration.paymentStatus === "verified" &&
            registration.entryVerified && (
              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-green-50 border-t">
                <div className="flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <p className="text-green-700 font-medium">
                    Entry has been verified
                  </p>
                </div>
                <p className="text-center text-sm text-green-600 mt-1">
                  Verified at {new Date(registration.entryTimestamp).toLocaleTimeString()} on {new Date(registration.entryTimestamp).toLocaleDateString()}
                </p>
              </div>
            )}
          
          {/* Verification Message */}
          {verificationMessage && (
            <div
              className={`px-4 sm:px-6 py-2 sm:py-3 ${
                verificationMessage.type === "success"
                  ? "bg-green-50"
                  : verificationMessage.type === "warning"
                  ? "bg-yellow-50"
                  : "bg-red-50"
              }`}
            >
              <p
                className={`text-xs sm:text-sm ${
                  verificationMessage.type === "success"
                    ? "text-green-700"
                    : verificationMessage.type === "warning"
                    ? "text-yellow-700"
                    : "text-red-700"
                }`}
              >
                {verificationMessage.text}
              </p>
            </div>
          )}
          
          {/* Not Admin Message */}
          {!isAdmin && registration.paymentStatus === "verified" && !registration.entryVerified && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-blue-50 border-t">
              <div className="flex items-center">
                <Lock className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-blue-700 text-sm sm:text-base font-medium">
                    Entry Verification Required
                  </p>
                  <p className="text-xs sm:text-sm text-blue-600 mt-1">
                    This pass requires verification by an administrator.
                    Please show this QR code to an event staff member.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Back button */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t">
            <button
              onClick={() => router.push("/")}
              className="text-blue-600 hover:text-blue-800 transition-colors text-xs sm:text-sm"
            >
              ← Return to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
