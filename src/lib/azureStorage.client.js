/**
 * Client-side utilities for Azure storage
 */

/**
 * Upload a file to Azure Blob Storage via our API
 * @param {File} file - The file to upload
 * @returns {Promise<string>} - The URL of the uploaded file
 */
export async function uploadToAzure(file) {
  if (!file) throw new Error("No file provided");
  
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
  return data.url;
}