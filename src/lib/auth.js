import { cookies } from "next/headers";

const JWT_SECRET =
  process.env.JWT_SECRET || "fallback_secret_key_for_development_only";
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Simple Edge-compatible JWT implementation for admin token
export function generateAdminToken() {
  // Create a payload with admin role and expiry
  const payload = {
    role: "admin",
    timestamp: Date.now(),
    exp: Date.now() + TOKEN_EXPIRY,
  };

  // Convert to base64
  const encodedPayload = btoa(JSON.stringify(payload));

  // Create a simple signature (in production, use a proper crypto algorithm)
  const signature = btoa(`${encodedPayload}:${JWT_SECRET}`);

  // Return the token
  return `${encodedPayload}.${signature}`;
}

// Verify a token
export function verifyToken(token) {
  try {
    if (!token || !token.includes(".")) {
      return null;
    }

    // Split the token
    const [encodedPayload, signature] = token.split(".");

    // Verify signature
    const expectedSignature = btoa(`${encodedPayload}:${JWT_SECRET}`);
    if (signature !== expectedSignature) {
      return null;
    }

    // Decode payload
    const payload = JSON.parse(atob(encodedPayload));

    // Check expiration
    if (payload.exp && payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return null;
  }
}

// Check if the request is from an admin by verifying JWT token
export async function checkAdminSession(request) {
  // Try to get cookies using next/headers
  let token = null;

  try {
    const cookieStore = await cookies();
    const tokenCookie = await cookieStore.get("adminToken");
    token = tokenCookie?.value;
  } catch (e) {
    // If cookies() fails, try to get from the request headers directly
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split("=");
        acc[key] = value;
        return acc;
      }, {});
      token = cookies.adminToken;
    }

    // Try Authorization header if cookie not found
    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
  }

  if (!token) {
    return false;
  }

  // Verify the token
  const decoded = verifyToken(token);
  return decoded !== null && decoded.role === "admin";
}
