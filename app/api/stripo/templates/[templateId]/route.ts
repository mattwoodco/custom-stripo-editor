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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    const { templateId } = await params;

    if (!templateId || templateId === "blank") {
      return NextResponse.json(
        {
          error: "Invalid template ID",
          html: "",
          css: "",
        },
        { status: 400 },
      );
    }

    // Stripo API requires numeric template IDs
    // Check if templateId is numeric (fallback templates use string IDs)
    const isNumericId = /^\d+$/.test(templateId);
    if (!isNumericId) {
      console.log(
        "[API] Non-numeric template ID detected (likely fallback template):",
        { templateId },
      );
      return NextResponse.json(
        {
          error: "Invalid template ID format",
          details: `Template ID "${templateId}" is not a valid Stripo template ID. Stripo requires numeric template IDs. This appears to be a fallback template that cannot be fetched from the Stripo API. Please select a template from the Stripo API list.`,
          html: "",
          css: "",
        },
        { status: 400 },
      );
    }

    console.log("[API] Fetching Stripo template details:", { templateId });

    // Get authentication token
    let token: string;
    try {
      token = await getStripoToken();
      console.log("[API] ✓ Token obtained for template fetch");
    } catch (error) {
      console.error("[API] ✗ Failed to get token:", error);
      return NextResponse.json(
        {
          error: "Failed to authenticate with Stripo",
          details: error instanceof Error ? error.message : "Unknown error",
          html: "",
          css: "",
        },
        { status: 500 },
      );
    }

    // Fetch template details from Stripo API
    const STRIPO_TEMPLATE_URL = `https://my.stripo.email/bapi/plugin-templates/v1/templates/${templateId}`;

    console.log("[API] Fetching template from:", STRIPO_TEMPLATE_URL);

    const response = await fetch(STRIPO_TEMPLATE_URL, {
      method: "GET",
      headers: {
        "ES-PLUGIN-AUTH": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("[API] Stripo template response:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => `HTTP ${response.status}`);
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { message: errorText };
      }

      console.error("[API] ✗ Failed to fetch template:", {
        status: response.status,
        error,
      });

      return NextResponse.json(
        {
          error: "Failed to fetch template from Stripo API",
          details: error.message || errorText,
          html: "",
          css: "",
        },
        { status: response.status },
      );
    }

    const data = (await response.json()) as {
      html?: string;
      css?: string;
      name?: string;
      description?: string;
    };

    console.log("[API] ✓ Template fetched successfully:", {
      hasHtml: !!data.html,
      htmlLength: data.html?.length || 0,
      hasCss: !!data.css,
      cssLength: data.css?.length || 0,
    });

    return NextResponse.json({
      html: data.html || "",
      css: data.css || "",
      name: data.name,
      description: data.description,
    });
  } catch (error) {
    console.error("[API] Error fetching Stripo template:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch template";

    return NextResponse.json(
      {
        error: errorMessage,
        html: "",
        css: "",
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
