"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { CreditCard } from "lucide-react";
import EmailVerification from "@/components/EmailVerification";
import { toast } from "react-hot-toast";

export default function RegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get registration ID from URL if available
  const registrationIdFromUrl = searchParams.get("registrationId");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    email: "",
    phone: "",
    educationStatus: "",
    participationCategories: {
      modelWalk: false,
      dance: false,
      movieSelection: false,
    },
    utrId: "",
    paymentScreenshot: null,
  });

  // Other states
  const [errors, setErrors] = useState({});
  const [formStep, setFormStep] = useState(1); // 1: Registration, 2: Payment, 3: Confirmation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false);
  const [showNavConfirmation, setShowNavConfirmation] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [paymentQRCode, setPaymentQRCode] = useState(null);
  const [loadingQR, setLoadingQR] = useState(false);
  
  // Email verification states
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  // Registration details for confirmation page
  const [registrationDetails, setRegistrationDetails] = useState(null);

  const [categoryCosts, setCategoryCosts] = useState({
    modelWalk: 499,
    dance: 499,
    movieSelection: 499,
  });

  // Check URL params on initial load to restore state
  useEffect(() => {
    // If URL has registration ID, go to confirmation page and try to fetch details
    if (registrationIdFromUrl) {
      setFormStep(3);
      setIsRegistrationComplete(true);
      fetchRegistrationDetails(registrationIdFromUrl);
    }

    const formContainer = document.querySelector(".form-container");
    if (formContainer) {
      formContainer.classList.add("form-loaded");
    }

    const handleBeforeUnload = (e) => {
      if (isSubmitting) {
        const message =
          "Your form is currently being submitted. Are you sure you want to leave?";
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [registrationIdFromUrl, isSubmitting]);

  useEffect(() => {
    fetchCategoryCosts();
  }, []);

  const fetchCategoryCosts = async () => {
    try {
      const response = await fetch("/api/admin/costs");
      const data = await response.json();
      if (response.ok) {
        setCategoryCosts(data.costs);
      }
    } catch (error) {
      console.error("Error fetching category costs:", error);
    }
  };

  // Fetch registration details by ID
  const fetchRegistrationDetails = async (id) => {
    try {
      const response = await fetch(`/api/registration/${id}`);
      if (response.ok) {
        const data = await response.json();
        
        // Make sure we store the QR code image from the response
        const registrationData = data.registration;
        
        // Check if we need to regenerate the QR code
        if (registrationData.paymentStatus === "verified" && !registrationData.qrCodeImage) {
          try {
            // Request QR code regeneration
            const qrResponse = await fetch(`/api/registration/${id}/qrcode`, {
              method: "GET",
            });
            
            if (qrResponse.ok) {
              const qrData = await qrResponse.json();
              registrationData.qrCodeImage = qrData.qrCodeImage;
            }
          } catch (qrError) {
            console.error("Failed to regenerate QR code:", qrError);
          }
        }
        
        setRegistrationDetails(registrationData);
        
        // Populate form data with fetched details
        setFormData({
          ...registrationData,
          paymentScreenshot: null, // Can't restore file object
        });
      } else {
        console.error("Failed to fetch registration details");
      }
    } catch (error) {
      console.error("Error fetching registration:", error);
    }
  };

  // Fetch category-specific QR code when categories change or when moving to payment step
  useEffect(() => {
    if (formStep === 2) {
      fetchCategoryQRCode();
    }
  }, [formStep, formData.participationCategories]);

  const fetchCategoryQRCode = async () => {
    try {
      setLoadingQR(true);
      const { modelWalk, dance, movieSelection } = formData.participationCategories;
      
      // Only fetch if at least one category is selected
      if (!modelWalk && !dance && !movieSelection) {
        setPaymentQRCode(null);
        return;
      }
      
      const queryParams = new URLSearchParams({
        modelWalk: modelWalk,
        dance: dance,
        movieSelection: movieSelection
      });
      
      const response = await fetch(`/api/payment-qr?${queryParams.toString()}`);
      const data = await response.json();
      
      if (response.ok && data.success && data.qrCode) {
        setPaymentQRCode(data.qrCode);
      } else {
        console.error("Failed to fetch QR code:", data.error || "Unknown error");
        setPaymentQRCode(null);
      }
    } catch (error) {
      console.error("Error fetching QR code:", error);
      setPaymentQRCode(null);
    } finally {
      setLoadingQR(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      participationCategories: {
        ...formData.participationCategories,
        [name]: checked,
      },
    });

    // Clear participation error if any option is selected
    if (
      errors.participationCategories &&
      (checked ||
        Object.values(formData.participationCategories).some((value) => value))
    ) {
      setErrors({ ...errors, participationCategories: null });
    }
  };

  // Calculate total cost
  const calculateTotalCost = () => {
    return Object.entries(formData.participationCategories)
      .filter(([_, selected]) => selected)
      .reduce((total, [category]) => total + categoryCosts[category], 0);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, paymentScreenshot: file });
      // Create a preview URL for the uploaded image
      const fileUrl = URL.createObjectURL(file);
      setPreviewUrl(fileUrl);

      // Clear error when file is uploaded
      if (errors.paymentScreenshot) {
        setErrors({ ...errors, paymentScreenshot: null });
      }
    }
  };

  // Validate both registration and payment form together
  const validateForm = () => {
    const newErrors = {};

    // Registration validation
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.age) newErrors.age = "Age is required";
    else if (isNaN(formData.age) || parseInt(formData.age) < 1)
      newErrors.age = "Please enter a valid age";

    if (!formData.gender) newErrors.gender = "Please select your gender";

    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Please enter a valid email";

    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    else if (!/^\d{10}$/.test(formData.phone))
      newErrors.phone = "Please enter a valid 10-digit phone number";

    if (!formData.educationStatus)
      newErrors.educationStatus = "Please select your education status";

    const hasSelectedCategory = Object.values(
      formData.participationCategories
    ).some((value) => value);
    if (!hasSelectedCategory)
      newErrors.participationCategories = "Please select at least one category";

    // Payment validation
    if (formStep === 2 || formData.utrId === "") {
      if (!formData.utrId.trim()) {
        newErrors.utrId = "Please enter the UTR ID";
      } else {
        // UTR ID validation - add specific validation for UTR ID
        const utrValue = formData.utrId.trim();
        if (utrValue.length < 12) {
          newErrors.utrId = "UTR ID must be at least 12 characters";
        } else if (utrValue.length > 16) {
          newErrors.utrId = "UTR ID must not exceed 16 characters";
        } else if (!/^[a-zA-Z0-9]+$/.test(utrValue)) {
          newErrors.utrId = "UTR ID must contain only letters and numbers";
        }
      }

      if (!formData.paymentScreenshot) {
        newErrors.paymentScreenshot = "Please upload your payment screenshot";
      }
    }

    return newErrors;
  };

  // Handle registration form submission (now starts email verification)
  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();

    // Only validate registration fields for now
    const formErrors = validateForm();
    // Filter errors to only include registration fields
    const registrationErrors = Object.keys(formErrors)
      .filter((key) => !["utrId", "paymentScreenshot"].includes(key))
      .reduce((obj, key) => {
        obj[key] = formErrors[key];
        return obj;
      }, {});

    if (Object.keys(registrationErrors).length > 0) {
      setErrors(registrationErrors);
      return;
    }

    // Instead of moving directly to payment step, start email verification
    initiateEmailVerification();
  };

  // Initiate email verification
  const initiateEmailVerification = async () => {
    setIsVerifyingEmail(true);
    
    try {
      // Send verification code to user's email
      const response = await fetch("/api/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email: formData.email,
          name: formData.name
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Show email verification popup
        setShowEmailVerification(true);
      } else {
        toast.error(data.message || "Failed to send verification code. Please try again.");
      }
    } catch (error) {
      console.error("Email verification error:", error);
      toast.error("An error occurred while sending the verification code. Please try again.");
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // Handle successful email verification
  const handleEmailVerificationSuccess = () => {
    setShowEmailVerification(false);
    setIsEmailVerified(true);
    toast.success("Email verified successfully!");
    
    // Now move to payment step
    setFormStep(2);
    // QR code will be fetched via useEffect when formStep changes
  };

  // Handle back button in email verification
  const handleEmailVerificationBack = () => {
    setShowEmailVerification(false);
  };

  // Submit both registration and payment data together
  const handleCompleteSubmission = async (e) => {
    e.preventDefault();

    const allErrors = validateForm();
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // First upload the screenshot to get a URL
      const screenshotUrl = await uploadScreenshot(formData.paymentScreenshot);

      // Then submit all form data
      const submissionData = {
        ...formData,
        paymentScreenshotUrl: screenshotUrl,
      };

      // Remove the actual file object as it can't be JSON serialized
      delete submissionData.paymentScreenshot;

      const response = await fetch("/api/registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      // Update URL with registration ID to enable persistence
      router.push(`?registrationId=${data.registrationId}`);

      // Save QR code image if provided in the response
      const registrationDetailsData = {
        ...submissionData,
        registrationId: data.registrationId,
        registrationDate: new Date().toISOString(),
      };

      if (data.qrCodeImage) {
        registrationDetailsData.qrCodeImage = data.qrCodeImage;
      }

      // Set registration details for confirmation page
      setRegistrationDetails(registrationDetailsData);

      // Move to confirmation step
      setFormStep(3);
      setIsRegistrationComplete(true);
    } catch (error) {
      console.error("Submission error:", error);
      setErrors((prevErrors) => ({
        ...prevErrors,
        submission:
          error.message ||
          "An error occurred during submission. Please try again.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to upload the screenshot to Azure Blob Storage
  const uploadScreenshot = async (file) => {
    if (!file) return null;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload file");
      }

      const data = await response.json();
      return data.url; // Return the Azure Blob Storage URL
    } catch (error) {
      console.error("Screenshot upload failed:", error);
      setErrors((prevErrors) => ({
        ...prevErrors,
        submission: "Failed to upload payment screenshot. Please try again.",
      }));
      throw error;
    }
  };

  // Handle register another participant button
  const resetForm = () => {
    if (isRegistrationComplete) {
      setShowNavConfirmation(true);
      setPendingNavigation("reset");
      return;
    }
    performResetForm();
  };

  // Actually reset the form and remove URL params
  const performResetForm = () => {
    // Clear URL parameters
    router.push("/");

    setFormData({
      name: "",
      age: "",
      gender: "",
      email: "",
      phone: "",
      educationStatus: "",
      participationCategories: {
        modelWalk: false,
        dance: false,
        movieSelection: false,
      },
      utrId: "",
      paymentScreenshot: null,
    });
    setErrors({});
    setPreviewUrl(null);
    setFormStep(1);
    setIsRegistrationComplete(false);
    setShowNavConfirmation(false);
    setPendingNavigation(null);
    setRegistrationDetails(null);
  };

  // Handle navigation between steps
  const handleNavigateStep = (step) => {
    if (formStep === 3 && isRegistrationComplete) {
      setShowNavConfirmation(true);
      setPendingNavigation(step);
      return;
    }
    setFormStep(step);
  };

  // Handle confirmation dialog responses
  const handleConfirmNavigation = (confirm) => {
    if (confirm && pendingNavigation === "reset") {
      performResetForm();
    } else if (confirm && typeof pendingNavigation === "number") {
      setFormStep(pendingNavigation);

      // If navigating away from confirmation page, update URL
      if (formStep === 3) {
        router.push("/");
      }

      setIsRegistrationComplete(false);
    }

    setShowNavConfirmation(false);
    setPendingNavigation(null);
  };

  // Get progress bar value
  const getProgressValue = () => {
    switch (formStep) {
      case 1:
        return 33;
      case 2:
        return 66;
      case 3:
        return 100;
      default:
        return 0;
    }
  };

  return (
    <>
      <div className="min-h-screen py-6 sm:py-8 md:py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 relative">
        {/* Background animations */}
        <div className="fixed top-0 w-full h-full inset-0 overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[10%] left-[5%] w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-[30%] right-[5%] w-[35vw] h-[35vw] max-w-[450px] max-h-[450px] bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[10%] left-[15%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
          <div className="absolute bottom-[30%] right-[15%] w-[25vw] h-[25vw] max-w-[350px] bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-6000"></div>
        </div>

        <header className="w-full max-w-4xl mb-6 sm:mb-8 md:mb-10 text-center relative z-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-3 text-gray-900 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 drop-shadow-sm">
            Fashion Show Event Registration
          </h1>
          <p className="text-lg sm:text-xl font-medium text-gray-600 max-w-2xl mx-auto">
            Join us for an exciting showcase of talent and style
          </p>
        </header>

        <div className="w-full max-w-4xl mb-6 sm:mb-8 md:mb-10 z-10">
          <div className="backdrop-blur-xl bg-white/60 p-4 sm:p-6 rounded-2xl shadow-xl border border-white/70 transition-all">
            <div className="flex justify-between mb-2">
              <div
                className={`text-sm font-medium transition-colors ${
                  formStep >= 1 ? "text-blue-600" : "text-gray-400"
                } ${
                  formStep > 1 && !isRegistrationComplete
                    ? "cursor-pointer"
                    : ""
                }`}
                onClick={() =>
                  formStep > 1 &&
                  !isRegistrationComplete &&
                  handleNavigateStep(1)
                }
              >
                Registration
              </div>
              <div
                className={`text-sm font-medium transition-colors ${
                  formStep >= 2 ? "text-blue-600" : "text-gray-400"
                } ${
                  formStep > 2 && !isRegistrationComplete
                    ? "cursor-pointer"
                    : ""
                }`}
                onClick={() =>
                  formStep > 2 &&
                  !isRegistrationComplete &&
                  handleNavigateStep(2)
                }
              >
                Payment
              </div>
              <div
                className={`text-sm font-medium transition-colors ${
                  formStep >= 3 ? "text-blue-600" : "text-gray-400"
                }`}
              >
                Confirmation
              </div>
            </div>
            <Progress
              value={getProgressValue()}
              className="h-2.5 bg-white/70"
            />
          </div>
        </div>

        <main className="w-full max-w-4xl z-10 form-container opacity-0 transition-opacity duration-1000">
          {/* Registration form */}
          {formStep === 1 && (
            <div className="backdrop-blur-xl bg-white/70 p-5 sm:p-6 md:p-8 rounded-2xl shadow-xl border border-white/70 form-section transform transition-all duration-500">
              <div className="flex items-center justify-center mb-5 sm:mb-6 md:mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 md:p-4 rounded-full shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 md:h-8 md:w-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl sm:text-2xl md:text-3xl font-semibold mb-2 sm:mb-3 text-center text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Secure Registration
              </h2>
              <p className="text-center text-gray-600 mb-5 sm:mb-6 md:mb-8">
                Your information is protected and encrypted
              </p>
              <form onSubmit={handleRegistrationSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                  <div className="group">
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors"
                    >
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/50 border ${
                        errors.name ? "border-red-500" : "border-gray-300"
                      } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all shadow-inner group-hover:shadow-md`}
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <p className="mt-1.5 text-sm text-red-600 font-medium">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="group">
                    <label
                      htmlFor="age"
                      className="block text-sm font-bold form-label mb-1 group-hover:text-blue-600 transition-colors"
                    >
                      Age *
                    </label>
                    <input
                      type="number"
                      id="age"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/50 border ${
                        errors.age ? "border-red-500" : "border-gray-300"
                      } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all shadow-inner group-hover:shadow-md`}
                      placeholder="Enter your age"
                      min="1"
                    />
                    {errors.age && (
                      <p className="mt-1.5 text-sm text-red-600 font-medium">
                        {errors.age}
                      </p>
                    )}
                  </div>

                  <div className="group">
                    <label className="block text-sm font-bold form-label mb-1 group-hover:text-blue-600 transition-colors">
                      Gender *
                    </label>
                    <div className="flex gap-3">
                      <label className="flex-1 backdrop-blur-sm bg-white/50 p-3 rounded-xl border border-gray-300 cursor-pointer transition-all hover:bg-white/80 hover:shadow-md hover:border-blue-300 hover:scale-105">
                        <input
                          type="radio"
                          name="gender"
                          value="male"
                          checked={formData.gender === "male"}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div
                          className={`text-center ${
                            formData.gender === "male"
                              ? "text-blue-600 font-medium"
                              : "text-gray-700"
                          }`}
                        >
                          Male
                        </div>
                      </label>
                      <label className="flex-1 backdrop-blur-sm bg-white/50 p-3 rounded-xl border border-gray-300 cursor-pointer transition-all hover:bg-white/80 hover:shadow-md hover:border-blue-300 hover:scale-105">
                        <input
                          type="radio"
                          name="gender"
                          value="female"
                          checked={formData.gender === "female"}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div
                          className={`text-center ${
                            formData.gender === "female"
                              ? "text-blue-600 font-medium"
                              : "text-gray-700"
                          }`}
                        >
                          Female
                        </div>
                      </label>
                      <label className="flex-1 backdrop-blur-sm bg-white/50 p-3 rounded-xl border border-gray-300 cursor-pointer transition-all hover:bg-white/80 hover:shadow-md hover:border-blue-300 hover:scale-105">
                        <input
                          type="radio"
                          name="gender"
                          value="other"
                          checked={formData.gender === "other"}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div
                          className={`text-center ${
                            formData.gender === "other"
                              ? "text-blue-600 font-medium"
                              : "text-gray-700"
                          }`}
                        >
                          Other
                        </div>
                      </label>
                    </div>
                    {errors.gender && (
                      <p className="mt-1.5 text-sm text-red-600 font-medium">
                        {errors.gender}
                      </p>
                    )}
                  </div>

                  <div className="group">
                    <label
                      htmlFor="educationStatus"
                      className="block text-sm font-bold form-label mb-1 group-hover:text-blue-600 transition-colors"
                    >
                      Education Status *
                    </label>
                    <select
                      id="educationStatus"
                      name="educationStatus"
                      value={formData.educationStatus}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/50 border ${
                        errors.educationStatus
                          ? "border-red-500"
                          : "border-gray-300"
                      } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all shadow-inner group-hover:shadow-md`}
                    >
                      <option value="" className="text-black">
                        Select status
                      </option>
                      <option value="inCollege" className="text-black">
                        In College
                      </option>
                      <option value="school" className="text-black">
                        School
                      </option>
                      <option value="none" className="text-black">
                        None
                      </option>
                    </select>
                    {errors.educationStatus && (
                      <p className="mt-1.5 text-sm text-red-600 font-medium">
                        {errors.educationStatus}
                      </p>
                    )}
                  </div>

                  <div className="group">
                    <label
                      htmlFor="email"
                      className="block text-sm font-bold form-label mb-1 group-hover:text-blue-600 transition-colors"
                    >
                      Email ID *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/50 border ${
                        errors.email ? "border-red-500" : "border-gray-300"
                      } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all shadow-inner group-hover:shadow-md`}
                      placeholder="Enter your email"
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-sm text-red-600 font-medium">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="group">
                    <label
                      htmlFor="phone"
                      className="block text-sm font-bold form-label mb-1 group-hover:text-blue-600 transition-colors"
                    >
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/50 border ${
                        errors.phone ? "border-red-500" : "border-gray-300"
                      } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all shadow-inner group-hover:shadow-md`}
                      placeholder="Enter your 10-digit phone number"
                    />
                    {errors.phone && (
                      <p className="mt-1.5 text-sm text-red-600 font-medium">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 sm:mt-7 md:mt-8">
                  <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                    Participation Categories *
                  </label>
                  <div className="space-y-3 sm:space-y-4">
                    <label className="block p-4 rounded-xl backdrop-blur-sm bg-white/50 border border-gray-300 hover:bg-white/80 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer hover:scale-[1.02]">
                      <input
                        type="checkbox"
                        name="modelWalk"
                        checked={formData.participationCategories.modelWalk}
                        onChange={handleCheckboxChange}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <span
                          className={`w-6 h-6 rounded-lg border ${
                            formData.participationCategories.modelWalk
                              ? "bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-500"
                              : "border-gray-300"
                          } mr-3 flex items-center justify-center transition-all`}
                        >
                          {formData.participationCategories.modelWalk && (
                            <svg
                              className="w-4 h-4 text-white"
                              viewBox="0 0 12 12"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M2 6L4.5 8.5L10 3"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">
                            Model Selection
                          </div>
                          <div className="text-sm text-gray-500">
                            Showcase your style on the runway
                          </div>
                          {/* <div className="text-sm text-blue-600 font-semibold">
                            ₹{categoryCosts.modelWalk}
                          </div> */}
                        </div>
                      </div>
                    </label>

                    <label className="block p-4 rounded-xl backdrop-blur-sm bg-white/50 border border-gray-300 hover:bg-white/80 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer hover:scale-[1.02]">
                      <input
                        type="checkbox"
                        name="dance"
                        checked={formData.participationCategories.dance}
                        onChange={handleCheckboxChange}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <span
                          className={`w-6 h-6 rounded-lg border ${
                            formData.participationCategories.dance
                              ? "bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-500"
                              : "border-gray-300"
                          } mr-3 flex items-center justify-center transition-all`}
                        >
                          {formData.participationCategories.dance && (
                            <svg
                              className="w-4 h-4 text-white"
                              viewBox="0 0 12 12"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M2 6L4.5 8.5L10 3"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">
                            Fashion Designer
                          </div>
                          <div className="text-sm text-gray-500">
                            Express yourself through fashion design
                          </div>
                          {/* <div className="text-sm text-blue-600 font-semibold"> */}
                            {/* ₹{categoryCosts.dance} */}
                          {/* </div> */}
                        </div>
                      </div>
                    </label>

                    <label className="block p-4 rounded-xl backdrop-blur-sm bg-white/50 border border-gray-300 hover:bg-white/80 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer hover:scale-[1.02]">
                      <input
                        type="checkbox"
                        name="movieSelection"
                        checked={
                          formData.participationCategories.movieSelection
                        }
                        onChange={handleCheckboxChange}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <span
                          className={`w-6 h-6 rounded-lg border ${
                            formData.participationCategories.movieSelection
                              ? "bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-500"
                              : "border-gray-300"
                          } mr-3 flex items-center justify-center transition-all`}
                        >
                          {formData.participationCategories.movieSelection && (
                            <svg
                              className="w-4 h-4 text-white"
                              viewBox="0 0 12 12"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M2 6L4.5 8.5L10 3"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">
                            Movie Selection
                          </div>
                          <div className="text-sm text-gray-500">
                            Participate in movie selection challenge
                          </div>
                          {/* <div className="text-sm text-blue-600 font-semibold">
                            ₹{categoryCosts.movieSelection}
                          </div> */}
                        </div>
                      </div>
                    </label>
                  </div>
                  {errors.participationCategories && (
                    <p className="mt-1.5 text-sm text-red-600 font-medium">
                      {errors.participationCategories}
                    </p>
                  )}
                </div>

                <div className="mt-4 p-4 backdrop-blur-xl bg-blue-50/50 rounded-xl border border-blue-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Total Cost</h3>
                      {/* <div className="text-sm text-gray-600">
                        <p>Model Selection: ₹{categoryCosts.modelWalk}</p>
                        <p>Fashion Designer: ₹{categoryCosts.dance}</p>
                        <p>Movie Selection: ₹{categoryCosts.movieSelection}</p>
                      </div> */}
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-blue-600">₹{calculateTotalCost()}</span>
                      <p className="text-sm text-gray-500">
                        {Object.values(formData.participationCategories).filter(Boolean).length} categories selected
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 sm:mt-7 md:mt-8 flex justify-center">
                  <button
                    type="submit"
                    disabled={isVerifyingEmail}
                    className="w-full sm:w-auto text-center py-3 sm:py-3.5 px-6 sm:px-8 md:px-10 rounded-lg sm:rounded-xl text-white bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 backdrop-blur-sm border border-white/20 shadow-lg sm:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 hover:scale-[1.03] sm:hover:scale-105 transform hover:shadow-blue-200/50"
                  >
                    {isVerifyingEmail ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span className="text-base sm:text-lg font-medium">Processing...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-base sm:text-lg font-medium">
                          Continue to Payment
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Payment form */}
          {formStep === 2 && (
            <div className="backdrop-blur-xl bg-white/70 p-5 sm:p-6 md:p-8 rounded-2xl shadow-xl border border-white/70 form-section transform transition-all duration-500">
              <div className="flex items-center justify-center mb-5 sm:mb-6 md:mb-8">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 md:p-4 rounded-full shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 md:h-8 md:w-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl sm:text-2xl md:text-3xl font-semibold mb-2 sm:mb-3 text-center text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600">
                Payment Details
              </h2>
              <p className="text-center text-gray-600 mb-5 sm:mb-6 md:mb-8">
                Complete your payment and upload confirmation details
              </p>

              <div className="backdrop-blur-md bg-blue-50/50 p-4 sm:p-5 rounded-lg border border-blue-100/50 mb-6 sm:mb-8">
                <h3 className="font-medium text-blue-900 mb-2">
                  Registration Summary
                </h3>
                <p className="text-black font-medium">Name: {formData.name}</p>
                <p className="text-black font-medium">
                  Email: {formData.email}
                </p>
                <p className="text-black font-medium">
                  Categories:{" "}
                  {Object.entries(formData.participationCategories)
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
                </p>
                <div className="mt-3 font-bold text-black">
                  Total Amount: ₹{calculateTotalCost()}
                </div>
              </div>

              <div className="flex flex-col items-center mb-6 sm:mb-8">
                <div className="text-center mb-4 sm:mb-6">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2 sm:mb-3">
                    Scan QR Code to Pay
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto mb-4 sm:mb-5 px-1">
                    Please scan the QR code below to make the payment. After
                    completing the payment, enter the transaction ID and upload
                    the screenshot below.
                  </p>
                </div>

                <div className="bg-white p-3 sm:p-4 rounded-xl shadow-lg mb-3 sm:mb-4 hover:shadow-xl transition-all">
                  {loadingQR ? (
                    <div className="flex items-center justify-center h-[150px] sm:h-[200px] w-[150px] sm:w-[200px]">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    </div>
                  ) : paymentQRCode ? (
                    <>
                      <img
                        src={paymentQRCode.qrImageUrl}
                        alt="Payment QR Code"
                        className="block w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] object-contain"
                      />
                      {paymentQRCode.name && (
                        <p className="text-xs text-center mt-1 text-gray-500">{paymentQRCode.name}</p>
                      )}
                    </>
                  ) : (
                    <svg
                      width="150"
                      height="150"
                      viewBox="0 0 100 100"
                      className="block sm:hidden"
                    >
                      <rect x="0" y="0" width="100" height="100" fill="white" />
                      {/* QR code pattern - fake but looks like a QR */}
                      <rect x="10" y="10" width="15" height="15" fill="black" />
                      <rect x="75" y="10" width="15" height="15" fill="black" />
                      <rect x="10" y="75" width="15" height="15" fill="black" />
                      <rect x="35" y="10" width="5" height="5" fill="black" />
                      <rect x="30" y="15" width="5" height="5" fill="black" />
                      <rect x="60" y="10" width="5" height="5" fill="black" />
                      <rect x="10" y="35" width="5" height="5" fill="black" />
                      <rect x="15" y="30" width="5" height="5" fill="black" />
                      <rect x="40" y="40" width="20" height="20" fill="black" />
                      <rect x="70" y="40" width="10" height="10" fill="black" />
                      <rect x="45" y="65" width="15" height="5" fill="black" />
                      <rect x="60" y="70" width="5" height="5" fill="black" />
                      <rect x="70" y="75" width="5" height="5" fill="black" />
                      <rect x="75" y="60" width="5" height="5" fill="black" />
                      <rect x="20" y="40" width="10" height="10" fill="black" />
                      <rect x="30" y="60" width="5" height="5" fill="black" />
                      <rect x="20" y="65" width="5" height="5" fill="black" />
                    </svg>
                  )}
                </div>
                <p className="text-base sm:text-lg font-semibold text-gray-900">
                  Fashion Show Event
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Amount: ₹{calculateTotalCost()}
                </p>
              </div>

              {/* Combined form submission for both registration and payment */}
              <form
                onSubmit={handleCompleteSubmission}
                className="space-y-4 sm:space-y-6"
              >
                {/* Payment form fields */}
                <div className="group">
                  <label
                    htmlFor="utrId"
                    className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors"
                  >
                    UTR / Transaction ID *
                  </label>
                  <input
                    type="text"
                    id="utrId"
                    name="utrId"
                    value={formData.utrId}
                    onChange={handleInputChange}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl backdrop-blur-sm bg-white/50 border ${
                      errors.utrId ? "border-red-500" : "border-gray-300"
                    } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all shadow-inner group-hover:shadow-md`}
                    placeholder="Payment UTR/transaction ID"
                  />
                  {errors.utrId && (
                    <p className="mt-1.5 text-sm text-red-600 font-medium">
                      {errors.utrId}
                    </p>
                  )}
                </div>

                <div className="group">
                  <label
                    htmlFor="paymentScreenshot"
                    className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors"
                  >
                    Payment Screenshot *
                  </label>
                  <div className="mt-1 flex justify-center px-3 sm:px-6 pt-4 sm:pt-5 pb-5 sm:pb-6 border-2 border-dashed border-gray-300 rounded-lg sm:rounded-xl backdrop-blur-sm bg-white/20 hover:bg-white/30 transition-colors">
                    <div className="space-y-1 text-center">
                      <svg
                        className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex flex-wrap justify-center text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white/50 rounded-md font-medium text-blue-600 hover:text-blue-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-2 mx-1"
                        >
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleFileChange}
                          />
                        </label>
                        <p className="px-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>
                  </div>
                  {previewUrl && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-1">Preview:</p>
                      <img
                        src={previewUrl}
                        alt="Payment screenshot preview"
                        className="h-32 sm:h-40 object-contain border border-gray-300 rounded-lg"
                      />
                    </div>
                  )}
                  {errors.paymentScreenshot && (
                    <p className="mt-1.5 text-sm text-red-600 font-medium">
                      {errors.paymentScreenshot}
                    </p>
                  )}
                </div>

                {/* Display general submission error if any */}
                {errors.submission && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {errors.submission}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 mt-6 sm:mt-8">
                  <button
                    type="button"
                    onClick={() => handleNavigateStep(1)}
                    className="order-2 sm:order-1 py-2.5 sm:py-3 px-4 sm:px-6 backdrop-blur-sm bg-white/50 border border-gray-300 rounded-lg sm:rounded-xl text-gray-700 font-medium hover:bg-white/60 hover:shadow-lg hover:border-blue-300 transition-all flex items-center justify-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    <span>Back to Registration</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="order-1 sm:order-2 py-3 sm:py-3.5 px-6 sm:px-8 rounded-lg sm:rounded-xl text-white bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 hover:from-green-600 hover:via-emerald-600 hover:to-teal-700 disabled:opacity-75 disabled:cursor-not-allowed backdrop-blur-sm border border-white/20 shadow-lg sm:shadow-xl transition-all flex items-center justify-center gap-2 hover:scale-[1.03] sm:hover:scale-105"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      <>
                        <span className="text-base sm:text-lg font-medium">
                          Complete Registration
                        </span>
                        <CreditCard className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Confirmation page */}
          {formStep === 3 && (
            <div className="backdrop-blur-md bg-white/60 p-5 sm:p-6 md:p-8 rounded-xl shadow-lg border border-white/50 form-section text-center">
              <div className="w-16 h-16 mx-auto bg-green-600/10 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h2 className="text-2xl font-semibold mt-4 mb-2 text-black">
                Registration Complete!
              </h2>

              <p className="text-black font-medium mb-4">
                 We have
                sent a confirmation email to {formData.email}. Please check your inbox (and spam folder).
              </p>

              <div className="backdrop-blur-md bg-blue-50/50 p-4 rounded-lg border border-blue-200 mb-6 text-left max-w-md mx-auto">
                <h3 className="font-medium text-blue-800 mb-2">
                  Registration Details
                </h3>
                <p className="text-black font-medium">Name: {formData.name}</p>
                <p className="text-black font-medium">
                  Event ID:{" "}
                  {registrationDetails?.registrationId ||
                    `FAS-${Math.floor(100000 + Math.random() * 900000)}`}
                </p>
                <p className="text-black font-medium">
                  UTR ID: {formData.utrId}
                </p>
                <p className="text-black font-medium">
                  Categories:{" "}
                  {Object.entries(formData.participationCategories)
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
                </p>
                <p className="text-black font-medium mt-2">
                  Total Amount: ₹{calculateTotalCost()}
                </p>
                <p className="text-black font-medium mt-2">
                  Registration Date:{" "}
                  {registrationDetails?.registrationDate
                    ? new Date(
                        registrationDetails.registrationDate
                      ).toLocaleDateString()
                    : new Date().toLocaleDateString()}
                </p>
                <div className={`mt-4 py-2 px-3 rounded-md ${
                  registrationDetails?.paymentStatus === "verified"
                    ? "bg-green-50 border border-green-200"
                    : registrationDetails?.paymentStatus === "rejected"
                    ? "bg-red-50 border border-red-200"
                    : "bg-yellow-50 border border-yellow-200"
                }`}>
                  <p className={`flex items-center gap-2 ${
                    registrationDetails?.paymentStatus === "verified"
                      ? "text-green-800"
                      : registrationDetails?.paymentStatus === "rejected"
                      ? "text-red-800"
                      : "text-yellow-800"
                  }`}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      {registrationDetails?.paymentStatus === "verified" ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      )}
                    </svg>
                    <span>
                      Payment Status:{" "}
                      <span className="font-medium capitalize">
                        {registrationDetails?.paymentStatus || "pending"}
                      </span>
                    </span>
                  </p>
                  <p className={`text-sm mt-1 ${
                    registrationDetails?.paymentStatus === "verified"
                      ? "text-green-700"
                      : registrationDetails?.paymentStatus === "rejected"
                      ? "text-red-700"
                      : "text-yellow-700"
                  }`}>
                    {registrationDetails?.paymentStatus === "verified"
                      ? "Your payment has been verified. Your QR code is ready below."
                      : registrationDetails?.paymentStatus === "rejected"
                      ? "Your payment was rejected. Please contact support for assistance."
                      : "We will notify you via email once your payment is verified."}
                  </p>
                </div>

                {/* QR Code Section - Only show when payment is verified */}
                {registrationDetails?.paymentStatus === "verified" && (
                  <div className="mt-6 text-center">
                    <h3 className="font-medium text-gray-900 mb-3">Entry Pass QR Code</h3>
                    <div className="bg-white p-4 rounded-lg shadow-sm inline-block">
                      {registrationDetails.qrCodeImage ? (
                        <img
                          src={registrationDetails.qrCodeImage}
                          alt="Entry QR Code"
                          className="w-48 h-48 mx-auto"
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded">
                          <p className="text-gray-500 text-sm text-center p-4">
                            QR code not available. Please refresh or check your email for the QR code.
                          </p>
                        </div>
                      )}
                      <p className="text-sm text-gray-600 mt-2">
                        Show this QR code at the event entrance
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Registration ID: {registrationDetails.registrationId}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-gray-600 mb-6">
                Please save your registration details. You can access this page
                later by using the link sent to your email.
              </p>

              <button
                onClick={resetForm}
                className="py-2.5 sm:py-3 px-6 sm:px-8 rounded-lg text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 backdrop-blur-sm border border-white/10 shadow-lg transition-all flex items-center justify-center gap-2 mx-auto hover:scale-[1.03] sm:hover:scale-105"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span className="text-base sm:text-lg font-medium">
                  Register Another Participant
                </span>
              </button>
            </div>
          )}

          {/* Navigation Confirmation Dialog */}
          {showNavConfirmation && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Confirmation
                </h3>
                <p className="text-gray-600 mb-6">
                  {pendingNavigation === "reset"
                    ? "You've successfully registered. Are you sure you want to register another participant?"
                    : "You've successfully registered. Are you sure you want to return to a previous step? This may affect your registration."}
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => handleConfirmNavigation(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleConfirmNavigation(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Email Verification Modal */}
        <EmailVerification
          email={formData.email}
          name={formData.name}
          onVerificationSuccess={handleEmailVerificationSuccess}
          onBack={handleEmailVerificationBack}
          isOpen={showEmailVerification}
        />

        <footer className="mt-8 sm:mt-10 md:mt-12 text-center relative z-10">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} Fashion Show Event. All rights
            reserved.
          </p>
          <p className="mt-1 text-sm text-gray-600">
            For any queries, contact us at: support@fashionshow.com
          </p>
        </footer>

        {/* Add global styles for animation */}
        <style jsx global>{`
          .form-container {
            opacity: 0;
            transition: opacity 1s ease-in-out;
          }

          .form-loaded {
            opacity: 1;
          }

          @keyframes blob {
            0% {
              transform: translate(0px, 0px) scale(1);
            }
            33% {
              transform: translate(30px, -50px) scale(1.1);
            }
            66% {
              transform: translate(-20px, 20px) scale(0.9);
            }
            100% {
              transform: translate(0px, 0px) scale(1);
            }
          }

          .animate-blob {
            animation: blob 15s infinite alternate;
          }

          .animation-delay-2000 {
            animation-delay: 2s;
          }

          .animation-delay-4000 {
            animation-delay: 4s;
          }

          .animation-delay-6000 {
            animation-delay: 6s;
          }
        `}</style>
      </div>
    </>
  );
}
