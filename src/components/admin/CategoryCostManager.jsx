"use client";

import { useState, useEffect } from "react";

export default function CategoryCostManager() {
  const [costs, setCosts] = useState({
    modelWalk: 499,
    dance: 499,
    movieSelection: 499,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchCosts();
  }, []);

  const fetchCosts = async () => {
    try {
      const response = await fetch("/api/admin/costs");
      const data = await response.json();
      if (response.ok) {
        setCosts(data.costs);
      } else {
        setError(data.error || "Failed to fetch costs");
      }
    } catch (error) {
      setError("Error fetching costs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage("");

    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/costs", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(costs),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccessMessage("Category costs updated successfully!");
      } else {
        setError(data.error || "Failed to update costs");
      }
    } catch (error) {
      setError("Error saving costs");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (category, value) => {
    setCosts((prev) => ({
      ...prev,
      [category]: parseInt(value) || 0,
    }));
  };

  if (isLoading) {
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
      <h2 className="text-xl font-semibold mb-4">Category Costs Management</h2>
      
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

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model Selection Cost (₹)
            </label>
            <input
              type="number"
              min="0"
              value={costs.modelWalk}
              onChange={(e) => handleChange("modelWalk", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fashion Designer Cost (₹)
            </label>
            <input
              type="number"
              min="0"
              value={costs.dance}
              onChange={(e) => handleChange("dance", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Movie Selection Cost (₹)
            </label>
            <input
              type="number"
              min="0"
              value={costs.movieSelection}
              onChange={(e) => handleChange("movieSelection", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSaving ? (
            <>
              <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </form>
    </div>
  );
}