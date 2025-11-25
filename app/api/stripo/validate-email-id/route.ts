import { type NextRequest, NextResponse } from "next/server";

// Helper function to fetch Stripo token (reused from token route)
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

  const STRIPO_AUTH_URL = "https://plugins.stripo.email/api/v1/auth";
  const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const response = await fetch(STRIPO_AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pluginId: apiKey,
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

export async function POST(request: NextRequest) {
  try {
    let body: { emailId: string };
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("[API] Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const { emailId } = body;

    if (!emailId || typeof emailId !== "string") {
      return NextResponse.json(
        { error: "emailId is required and must be a string" },
        { status: 400 },
      );
    }

    console.log("[API] ===== VALIDATING EMAIL ID =====");
    console.log("[API] EmailId to validate:", emailId);

    // Get token first
    let _token: string;
    try {
      _token = await getStripoToken();
      console.log("[API] ✓ Token obtained for validation");
    } catch (error) {
      console.error("[API] ✗ Failed to get token for validation:", error);
      return NextResponse.json(
        {
          error: "Failed to authenticate with Stripo",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }

    // Try to fetch template data using Stripo API
    // Note: Stripo Plugin API doesn't have a direct "get template" endpoint
    // But we can try to use the template endpoint to check if it exists
    // The actual validation happens when the SDK tries to load the template
    // For now, we'll return a response indicating we can't validate server-side
    // The real validation happens client-side when the editor initializes

    console.log(
      "[API] ⚠ Stripo Plugin API doesn't have a direct template validation endpoint",
    );
    console.log(
      "[API] Template existence will be validated when the editor initializes",
    );

    // Return response indicating validation will happen client-side
    return NextResponse.json({
      emailId,
      exists: null, // Unknown - will be validated client-side
      note: "Stripo Plugin API doesn't support server-side template validation. The template will be validated when the editor initializes. If the template doesn't exist, Stripo SDK will create it automatically.",
      recommendation:
        "If you want to ensure a template exists, initialize the editor with this emailId. If it doesn't exist, Stripo will create it.",
    });
  } catch (error) {
    console.error("[API] Error validating emailId:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to validate emailId";
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
