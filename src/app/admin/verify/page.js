"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TicketVerification() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState('');

  const verifyTicket = async (qrData) => {
    try {
      const data = JSON.parse(qrData);
      const response = await fetch("/api/tickets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: data.registrationId }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.message);

      setResult(result);
      setError(null);
    } catch (error) {
      setError(error.message || "Verification failed");
      setResult(null);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (result?.registration?.entryTimestamp) {
      setCurrentTime(new Date(result.registration.entryTimestamp).toLocaleTimeString());
    }
  }, [result]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Ticket Verification
          </h1>

          {/* QR Scanner Component will be added here */}
          <div className="mb-6">
            <button
              onClick={() => setScanning(!scanning)}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {scanning ? "Stop Scanning" : "Start Scanning"}
            </button>
          </div>

          {/* Results Display */}
          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-800">Entry Verified!</h3>
              <p className="text-sm text-green-600 mt-1">
                Name: {result.registration.name}
              </p>
              <p className="text-sm text-green-600">
                ID: {result.registration.registrationId}
              </p>
              <p className="text-sm text-green-600">
                Time:{" "}
                {currentTime}
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
