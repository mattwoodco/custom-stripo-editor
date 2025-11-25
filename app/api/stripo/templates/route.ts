import { type NextRequest, NextResponse } from "next/server";

// Helper function to get Stripo token (reuse from token route pattern)
async function getStripoToken(): Promise<string> {
  const apiKey =
    process.env.STRIPO_PLUGIN_ID ||
    process.env.NEXT_PUBLIC_STRIPO_PLUGIN_ID ||
    process.env.NEXT_PUBLIC_STRIPO_API_KEY ||
    process.env.STRIPO_API_KEY;
  const secretKey =
    process.env.STRIPO_SECRET_KEY || process.env.NEXT_PUBLIC_STRIPO_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error("Stripo API credentials not configured");
  }

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

  let pluginIdToUse = apiKey;
  if (apiKey && apiKey.startsWith("eyJ")) {
    const decoded = decodeJWT(apiKey);
    if (decoded) {
      if ("pluginId" in decoded && typeof decoded.pluginId === "string") {
        pluginIdToUse = decoded.pluginId;
      } else if ("id" in decoded && typeof decoded.id === "string") {
        pluginIdToUse = decoded.id;
      }
    }
  }

  const STRIPO_AUTH_URL = "https://plugins.stripo.email/api/v1/auth";
  const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const response = await fetch(STRIPO_AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pluginId: pluginIdToUse,
      secretKey: secretKey,
      userId: userId,
      role: "user",
    }),
  });

  if (!response.ok) {
    const errorText = await response
      .text()
      .catch(() => `HTTP ${response.status}`);
    throw new Error(`Failed to authenticate with Stripo: ${errorText}`);
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "FREE"; // FREE, BASIC, PREMIUM
    const limit = searchParams.get("limit") || "50";
    const sort = searchParams.get("sort") || "NEW"; // NEW, POPULAR, etc.
    const page = searchParams.get("page") || "0";

    console.log("[API] Fetching Stripo templates:", {
      type,
      limit,
      sort,
      page,
    });

    // Get authentication token
    let token: string;
    try {
      token = await getStripoToken();
      console.log("[API] ✓ Token obtained for template fetching");
    } catch (error) {
      console.error("[API] ✗ Failed to get token:", error);
      return NextResponse.json(
        {
          error: "Failed to authenticate with Stripo",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }

    // Try fetching templates, fallback to other types if FREE is restricted
    const templateTypesToTry =
      type === "FREE" ? ["FREE", "BASIC", "PREMIUM"] : [type];
    let lastError: { status: number; message: string } | null = null;

    for (const tryType of templateTypesToTry) {
      const STRIPO_TEMPLATES_URL = `https://my.stripo.email/bapi/plugin-templates/v1/templates?type=${tryType}&limit=${limit}&sort=${sort}&page=${page}`;

      console.log("[API] Fetching templates from:", STRIPO_TEMPLATES_URL);

      const response = await fetch(STRIPO_TEMPLATES_URL, {
        method: "GET",
        headers: {
          "ES-PLUGIN-AUTH": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("[API] Stripo templates response:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        type: tryType,
      });

      if (response.ok) {
        const data = (await response.json()) as {
          data?: Array<{
            templateId: number | string;
            name: string;
            description?: string;
            previewUrl?: string;
            category?: string;
          }>;
        };

        console.log("[API] ✓ Templates fetched successfully:", {
          count: data.data?.length || 0,
          type: tryType,
        });

        // Convert templateIds to strings (API returns numbers, but we need strings)
        const templates = (data.data || []).map((template) => ({
          ...template,
          templateId: String(template.templateId),
        }));

        return NextResponse.json({
          templates,
          type: tryType,
          limit,
          sort,
          page,
        });
      }

      // If not ok, save error and try next type
      const errorText = await response
        .text()
        .catch(() => `HTTP ${response.status}`);
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { message: errorText };
      }

      lastError = {
        status: response.status,
        message: error.message || errorText,
      };

      console.warn("[API] ✗ Failed to fetch templates for type:", {
        type: tryType,
        status: response.status,
        error: lastError.message,
      });

      // If this was a pricing/restriction error, try next type
      if (
        response.status === 400 &&
        lastError.message.includes("pricing plan")
      ) {
        console.log("[API] Template type restricted, trying next type...");
        continue;
      }

      // For other errors, break and return error
      break;
    }

    // If we get here, all types failed
    console.error("[API] ✗ Failed to fetch templates from all types:", {
      lastError,
    });

    // Return error with helpful message
    return NextResponse.json(
      {
        error: "Failed to fetch templates from Stripo API",
        details:
          lastError?.message ||
          "Template access may be restricted by your pricing plan. Please contact support@stripo.email for assistance.",
        templates: [],
      },
      { status: lastError?.status || 400 },
    );
  } catch (error) {
    console.error("[API] Error fetching Stripo templates:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch templates";

    return NextResponse.json(
      {
        error: errorMessage,
        templates: [],
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
