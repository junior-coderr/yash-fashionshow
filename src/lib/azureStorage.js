import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";

// Get connection string from environment variable
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName =
  process.env.AZURE_STORAGE_CONTAINER_NAME || "paymentscreenshots";

if (!connectionString) {
  console.error("Azure Storage connection string not found");
}

/**
 * Uploads a file to Azure Blob Storage
 * @param {Buffer} fileBuffer - File buffer data
 * @param {string} contentType - MIME type of the file
 * @param {string} fileName - Original file name (used to determine extension)
 * @returns {Promise<string>} - URL of the uploaded blob
 */
export async function uploadToAzure(
  fileBuffer,
  contentType,
  fileName = "upload.jpg"
) {
  try {
    // Create BlobServiceClient
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);

    // Get container client
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Create container if it doesn't exist
    await containerClient.createIfNotExists({
      access: "blob", // Public access at blob level
    });

    // Generate unique blob name
    const fileExtension = fileName.split(".").pop();
    const blobName = `${uuidv4()}.${fileExtension}`;

    // Get blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload blob
    await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });

    // Return URL
    return blockBlobClient.url;
  } catch (error) {
    console.error("Error uploading to Azure:", error);
    throw new Error("Failed to upload file to Azure Blob Storage");
  }
}

/**
 * Delete a blob from Azure Blob Storage
 * @param {string} blobUrl - Full URL of the blob to delete
 */
export async function deleteFromAzure(blobUrl) {
  try {
    // Extract blob name from URL
    const url = new URL(blobUrl);
    const blobPath = url.pathname;
    const blobName = blobPath.substring(blobPath.lastIndexOf("/") + 1);

    // Create BlobServiceClient
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);

    // Get container & blob client
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Delete blob
    await blockBlobClient.delete();

    return true;
  } catch (error) {
    console.error("Error deleting from Azure:", error);
    return false;
  }
}
