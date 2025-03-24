import { BlobServiceClient } from "@azure/storage-blob";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName =
  process.env.AZURE_STORAGE_CONTAINER_NAME || "paymentscreenshots";

if (!connectionString) {
  console.error(
    "Azure Storage connection string not found in environment variables"
  );
  process.exit(1);
}

async function initializeAzureStorage() {
  try {
    console.log("Initializing Azure Blob Storage container...");

    // Create BlobServiceClient
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);

    // Get container client
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Create container if it doesn't exist
    const createResult = await containerClient.createIfNotExists({
      access: "blob", // Allow public access at blob level
    });

    if (createResult.succeeded) {
      console.log(`Container "${containerName}" created successfully`);
    } else {
      console.log(`Container "${containerName}" already exists`);
    }

    // Set access policy to allow public access at the blob level
    await containerClient.setAccessPolicy("blob");
    console.log(`Access policy set to "blob" (public read access for blobs)`);

    console.log("Azure Blob Storage container initialized successfully");
  } catch (error) {
    console.error("Error initializing Azure Blob Storage:", error);
  }
}

initializeAzureStorage().catch(console.error);
