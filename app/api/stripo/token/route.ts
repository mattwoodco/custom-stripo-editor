import { type NextRequest, NextResponse } from "next/server";

// Simple JWT decode without verification (just to extract payload)
function decodeJWT(token: string): { [key: string]: any } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = Buffer.from(payload, "base64url").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Prioritize server-side variables (matching conversion-tracking pattern)
    // Server-side API routes can access both server and client env vars
    // IMPORTANT: Check NEXT_PUBLIC_STRIPO_PLUGIN_ID before NEXT_PUBLIC_STRIPO_API_KEY
    // because API_KEY might be a JWT token, not the plugin ID
    const apiKey =
      process.env.STRIPO_PLUGIN_ID ||
      process.env.NEXT_PUBLIC_STRIPO_PLUGIN_ID ||
      process.env.NEXT_PUBLIC_STRIPO_API_KEY ||
      process.env.STRIPO_API_KEY;
    const secretKey =
      process.env.STRIPO_SECRET_KEY ||
      process.env.NEXT_PUBLIC_STRIPO_SECRET_KEY;

    if (!apiKey || !secretKey) {
      console.error("[API] Missing Stripo credentials:", {
        hasPluginId: !!process.env.STRIPO_PLUGIN_ID,
        hasApiKey: !!process.env.NEXT_PUBLIC_STRIPO_API_KEY,
        hasSecretKey: !!process.env.STRIPO_SECRET_KEY,
        hasPublicSecretKey: !!process.env.NEXT_PUBLIC_STRIPO_SECRET_KEY,
        allEnvKeys: Object.keys(process.env).filter((key) =>
          key.includes("STRIPO"),
        ),
      });
      return NextResponse.json(
        {
          error: "Stripo API credentials not configured",
          hint: "Please set STRIPO_PLUGIN_ID and STRIPO_SECRET_KEY in your .env.local file (server-side variables, no NEXT_PUBLIC_ prefix needed for API routes)",
          availableEnvVars:
            process.env.NODE_ENV === "development"
              ? Object.keys(process.env).filter((key) => key.includes("STRIPO"))
              : undefined,
        },
        { status: 500 },
      );
    }

    // Stripo auth endpoint - using pluginId (apiKey) and secretKey
    const STRIPO_AUTH_URL = "https://plugins.stripo.email/api/v1/auth";

    // Generate a userId (can be any unique identifier for the user)
    // In a real app, this would come from the authenticated user's session
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check if pluginId is a JWT token (common mistake - env var might contain JWT instead of pluginId)
    let pluginIdToUse = apiKey;
    if (apiKey && apiKey.startsWith("eyJ")) {
      // Looks like a JWT token - try to decode it
      const decoded = decodeJWT(apiKey);
      if (decoded) {
        console.warn(
          "[API] STRIPO_PLUGIN_ID appears to be a JWT token. Attempting to extract pluginId...",
        );

        // Try to extract pluginId from JWT payload
        if ("pluginId" in decoded && typeof decoded.pluginId === "string") {
          pluginIdToUse = decoded.pluginId;
          console.log("[API] ✓ Extracted pluginId from JWT");
        } else if ("id" in decoded && typeof decoded.id === "string") {
          pluginIdToUse = decoded.id;
          console.log("[API] ✓ Extracted id from JWT as pluginId");
        } else {
          console.error(
            "[API] ✗ JWT decoded but no pluginId/id found. JWT payload keys:",
            Object.keys(decoded),
          );
          console.error(
            "[API] WARNING: Using JWT token as pluginId - this will likely fail. Please set STRIPO_PLUGIN_ID to the actual plugin ID string.",
          );
        }
      }
    }

    // Also check if it's JSON (less common but possible)
    if (pluginIdToUse === apiKey && apiKey.length > 50) {
      try {
        const parsed = JSON.parse(apiKey);
        if (typeof parsed === "object" && parsed !== null) {
          console.warn(
            "[API] STRIPO_PLUGIN_ID appears to be JSON. Attempting to extract pluginId...",
          );
          if ("pluginId" in parsed && typeof parsed.pluginId === "string") {
            pluginIdToUse = parsed.pluginId;
            console.log("[API] ✓ Extracted pluginId from JSON object");
          }
        }
      } catch {
        // Not JSON, use as-is
      }
    }

    const requestBody = {
      pluginId: pluginIdToUse,
      secretKey: secretKey,
      userId: userId,
      role: "user",
    };

    // Only log detailed info in development or if there's an issue
    if (process.env.NODE_ENV === "development") {
      console.log("[API] Stripo auth request:", {
        url: STRIPO_AUTH_URL,
        pluginIdLength: pluginIdToUse?.length,
        secretKeyLength: secretKey?.length,
        pluginIdPreview: pluginIdToUse
          ? `${pluginIdToUse.substring(0, 10)}...${pluginIdToUse.substring(pluginIdToUse.length - 6)}`
          : undefined,
        userId,
        role: "user",
      });
    }

    const response = await fetch(STRIPO_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => `HTTP ${response.status}`);
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { message: errorText, rawText: errorText };
      }

      // Log full response details for debugging
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      console.error("[API] Stripo auth error - full details:", {
        status: response.status,
        statusText: response.statusText,
        error,
        errorText,
        responseHeaders,
        apiKeyProvided: !!apiKey,
        secretKeyProvided: !!secretKey,
        apiKeyPreview: apiKey
          ? `${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 10)}`
          : undefined,
        secretKeyPreview: secretKey
          ? `${secretKey.substring(0, 4)}...${secretKey.substring(secretKey.length - 4)}`
          : undefined,
        url: STRIPO_AUTH_URL,
        requestBody: {
          pluginIdLength: apiKey?.length,
          secretKeyLength: secretKey?.length,
          userId,
          role: "user",
        },
      });

      // Provide helpful error messages based on status code
      let errorMessage = error.message || "Failed to authenticate with Stripo";
      if (response.status === 404) {
        errorMessage =
          "Stripo authentication endpoint not found. Please verify your STRIPO_PLUGIN_ID and STRIPO_SECRET_KEY are correct.";
      } else if (response.status === 401) {
        errorMessage =
          "Invalid Stripo credentials. Please check your STRIPO_PLUGIN_ID and STRIPO_SECRET_KEY.";
      } else if (response.status === 400) {
        errorMessage =
          error.message ||
          "Invalid request to Stripo API. Please check your credentials format.";
      }

      return NextResponse.json(
        {
          error: errorMessage,
          code: error.code,
          status: response.status,
          details:
            process.env.NODE_ENV === "development"
              ? {
                  ...error,
                  url: STRIPO_AUTH_URL,
                }
              : undefined,
        },
        { status: response.status },
      );
    }

    const data = (await response.json()) as { token: string };
    return NextResponse.json({ token: data.token });
  } catch (error) {
    console.error("[API] Error fetching Stripo token:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch token";
    return NextResponse.json(
      { error: errorMessage },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
