"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { BsFillShieldLockFill } from "react-icons/bs";
import { FiRefreshCw } from "react-icons/fi";
import { X } from "lucide-react";

const EmailVerification = ({ email, name, onVerificationSuccess, onBack, isOpen }) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(true);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = Array(6).fill(0).map(() => useRef());
  const modalRef = useRef(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target) && !loading) {
        onBack();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = ''; // Re-enable scrolling when modal is closed
    };
  }, [isOpen, loading, onBack]);

  useEffect(() => {
    // Focus first input on mount
    if (isOpen && inputRefs[0]?.current) {
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 100);
    }
    
    // Start countdown for resend button
    if (resendDisabled) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setResendDisabled(false);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [resendDisabled, isOpen]);

  const handleChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste of full OTP
      const pastedValue = value.slice(0, 6).split("");
      const newOtp = [...otp];
      
      pastedValue.forEach((char, i) => {
        if (i < 6) {
          newOtp[i] = char;
        }
      });
      
      setOtp(newOtp);
      
      // Focus last field or the next empty field
      const lastFilledIndex = newOtp.findIndex((digit) => !digit);
      const focusIndex = lastFilledIndex === -1 ? 5 : lastFilledIndex;
      inputRefs[focusIndex].current?.focus();
    } else {
      // Handle single digit input
      const digit = value.replace(/[^0-9]/g, "");
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);
      
      // Auto-focus next input
      if (digit && index < 5) {
        inputRefs[index + 1].current?.focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // If current input is empty, focus previous input
        inputRefs[index - 1].current?.focus();
      }
    }
  };

  const verifyOTP = async () => {
    const otpValue = otp.join("");
    
    if (otpValue.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch("/api/verify-email", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ otp: otpValue }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success("Email verified successfully!");
        onVerificationSuccess();
      } else {
        toast.error(data.message || "Invalid verification code");
        setOtp(["", "", "", "", "", ""]);
        inputRefs[0].current?.focus();
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("An error occurred. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setLoading(true);

    const resendPromise = fetch("/api/verify-email", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    toast.promise(
      resendPromise,
      {
        loading: 'Sending new code...',
        success: 'New verification code sent!',
        error: 'Failed to send code',
      },
      {
        success: {
          duration: 3000,
        },
        error: {
          duration: 4000,
        },
      }
    );

    try {
      const response = await resendPromise;
      const data = await response.json();

      if (data.success) {
        setResendDisabled(true);
        setCountdown(60);
        setOtp(["", "", "", "", "", ""]);
        inputRefs[0].current?.focus();
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div ref={modalRef} className="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all animate-fadeIn">
        <div className="p-6 relative">
          <button 
            onClick={onBack} 
            disabled={loading}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="text-center mb-6">
            <div className="inline-block p-3 bg-indigo-100 rounded-full mb-3">
              <BsFillShieldLockFill className="text-indigo-600 text-2xl" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Verify Your Email</h2>
            <p className="text-gray-600 mt-1">
              We have sent a verification code to
              <br />
              <span className="font-medium text-indigo-600">{email}</span>
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Verification Code
            </label>
            <div className="flex justify-between items-center space-x-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  maxLength={6}  // Allow paste of full code
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-full h-12 text-center text-xl font-bold border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={verifyOTP}
              disabled={loading || otp.join("").length !== 6}
              className="w-full py-3 bg-indigo-600 text-white rounded-md font-medium transition duration-300 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-gray-600 text-sm">
              Didn't receive the code?{" "}
              <button
                onClick={resendOTP}
                disabled={resendDisabled || loading}
                className="text-indigo-600 font-medium hover:text-indigo-800 inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendDisabled ? (
                  `Resend in ${countdown}s`
                ) : (
                  <>
                    <FiRefreshCw className="mr-1" /> Resend Code
                  </>
                )}
              </button>
            </p>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default EmailVerification;
