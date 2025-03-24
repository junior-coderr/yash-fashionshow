"use client";
import { useState, useEffect, useRef } from "react";
import { uploadToAzure } from "@/lib/azureStorage.client";

export default function PaymentQRManager() {
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const fileInputRef = useRef(null);
  
  // Category costs state
  const [categoryCosts, setCategoryCosts] = useState({
    modelWalk: 499,
    dance: 499,
    movieSelection: 499,
  });
  
  // New QR code form state
  const [newQR, setNewQR] = useState({
    modelWalk: false,
    dance: false,
    movieSelection: false,
    file: null,
    name: "",
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Fetch all payment QR codes and category costs on component mount
  useEffect(() => {
    fetchPaymentQRCodes();
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
  
  const fetchPaymentQRCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/admin/payment-qr");
      const data = await response.json();
      
      if (response.ok) {
        setQrCodes(data.qrCodes || []);
      } else {
        setError(data.error || "Failed to fetch QR codes");
      }
    } catch (error) {
      setError("Error fetching QR codes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total cost based on selected categories
  const calculateTotalCost = (selectedCategories = newQR) => {
    return Object.entries(selectedCategories)
      .filter(([key, value]) => value === true && key !== 'file' && categoryCosts[key])
      .reduce((total, [key]) => total + categoryCosts[key], 0);
  };

  const handleCategoryToggle = (category) => {
    setNewQR(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewQR(prev => ({ ...prev, file }));
      
      // Create preview URL
      const fileReader = new FileReader();
      fileReader.onload = () => {
        setPreviewUrl(fileReader.result);
      };
      fileReader.readAsDataURL(file);
    }
  };

  const handleNameChange = (e) => {
    setNewQR(prev => ({ ...prev, name: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newQR.file) {
      setError("Please select a QR image file to upload");
      return;
    }
    
    if (!newQR.modelWalk && !newQR.dance && !newQR.movieSelection) {
      setError("Please select at least one category");
      return;
    }
    
    try {
      setUploading(true);
      setError(null);
      setSuccessMessage("");
      
      // 1. Upload image to Azure Blob Storage
      const formData = new FormData();
      formData.append("file", newQR.file);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload QR image");
      }
      
      const uploadData = await response.json();
      const qrImageUrl = uploadData.url;
      
      // 2. Save QR code mapping to database
      const saveResponse = await fetch("/api/admin/payment-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify({
          modelWalk: newQR.modelWalk,
          dance: newQR.dance,
          movieSelection: newQR.movieSelection,
          qrImageUrl,
          name: newQR.name,
        }),
      });
      
      const saveData = await saveResponse.json();
      
      if (!saveResponse.ok) {
        throw new Error(saveData.error || "Failed to save QR code");
      }
      
      // Success
      setSuccessMessage("Payment QR code saved successfully!");
      
      // Reset form
      setNewQR({
        modelWalk: false,
        dance: false,
        movieSelection: false,
        file: null,
        name: "",
      });
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      // Refresh the list
      fetchPaymentQRCodes();
      
    } catch (error) {
      setError(error.message || "Failed to save payment QR code");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this QR code? This action cannot be undone.")) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/payment-qr?id=${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("adminToken")}`,
        },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete QR code");
      }
      
      setSuccessMessage("QR code deleted successfully");
      fetchPaymentQRCodes();
      
    } catch (error) {
      setError(error.message || "Error deleting QR code");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getCombinationName = (qrCode) => {
    const categories = [];
    if (qrCode.modelWalk) categories.push("Model Selection");
    if (qrCode.dance) categories.push("Dance");
    if (qrCode.movieSelection) categories.push("Movie Selection");
    return categories.join(" + ") || "No categories selected";
  };

  // Calculate total cost for an existing QR code
  const getQRTotalCost = (qrCode) => {
    let total = 0;
    if (qrCode.modelWalk) total += categoryCosts.modelWalk;
    if (qrCode.dance) total += categoryCosts.dance;
    if (qrCode.movieSelection) total += categoryCosts.movieSelection;
    return total;
  };

  if (loading && qrCodes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Payment QR Code Management</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
          {successMessage}
        </div>
      )}
      
      {/* Add new QR code form */}
      <form onSubmit={handleSubmit} className="mb-8 border-b pb-6">
        <h3 className="text-lg font-medium mb-4">Add New Payment QR Code</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Categories
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Choose which category combination this QR code will be displayed for.
          </p>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={newQR.modelWalk}
                onChange={() => handleCategoryToggle("modelWalk")}
                className="h-4 w-4 text-blue-600 mr-2"
              />
              <div className="flex flex-col">
                <span>Model Selection</span>
                <span className="text-xs text-gray-500">₹{categoryCosts.modelWalk}</span>
              </div>
            </label>
            
            <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={newQR.dance}
                onChange={() => handleCategoryToggle("dance")}
                className="h-4 w-4 text-blue-600 mr-2"
              />
              <div className="flex flex-col">
                <span>Dance</span>
                <span className="text-xs text-gray-500">₹{categoryCosts.dance}</span>
              </div>
            </label>
            
            <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={newQR.movieSelection}
                onChange={() => handleCategoryToggle("movieSelection")}
                className="h-4 w-4 text-blue-600 mr-2"
              />
              <div className="flex flex-col">
                <span>Movie Selection</span>
                <span className="text-xs text-gray-500">₹{categoryCosts.movieSelection}</span>
              </div>
            </label>
          </div>

          {/* Display total cost of selected categories */}
          {(newQR.modelWalk || newQR.dance || newQR.movieSelection) && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-800">Total Cost:</span>
                <span className="font-bold text-blue-800">₹{calculateTotalCost()}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            QR Code Name (Optional)
          </label>
          <input
            type="text"
            value={newQR.name}
            onChange={handleNameChange}
            placeholder="e.g. UPI QR Code for Model Selection"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload QR Code Image
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 rounded-md">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
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
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                >
                  <span>Upload a file</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
            </div>
          </div>
          
          {previewUrl && (
            <div className="mt-4 flex justify-center">
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="QR code preview"
                  className="h-48 w-48 object-contain border rounded-md"
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
                  onClick={() => {
                    setPreviewUrl(null);
                    setNewQR(prev => ({ ...prev, file: null }));
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={uploading}
          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
              Uploading...
            </span>
          ) : (
            "Save QR Code"
          )}
        </button>
      </form>
      
      {/* Existing QR codes list */}
      <h3 className="text-lg font-medium mb-4">Existing Payment QR Codes</h3>
      
      {qrCodes.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          No payment QR codes have been added yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {qrCodes.map((qr) => (
            <div key={qr._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-center mb-3">
                <img
                  src={qr.qrImageUrl}
                  alt={`QR Code for ${getCombinationName(qr)}`}
                  className="h-36 w-36 object-contain"
                />
              </div>
              
              <div className="mb-2">
                <h4 className="font-medium">{qr.name || "Unnamed QR Code"}</h4>
                <p className="text-sm text-gray-600">{getCombinationName(qr)}</p>
                <div className="mt-2 p-2 bg-blue-50 rounded-md">
                  <span className="text-sm font-medium text-blue-800">Amount: ₹{getQRTotalCost(qr)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Updated: {new Date(qr.updatedAt).toLocaleString()}
                </p>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => handleDelete(qr._id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}